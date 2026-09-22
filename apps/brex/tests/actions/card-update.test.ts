import { assert, assertEquals } from "@std/assert";
import cardUpdate, {
  buildSpendControls,
  MAX_MERCHANTS,
  merchantList,
} from "../../actions/card-update.ts";
import { bodyOf, CARD, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("card-update: PUTs spend controls under Brex's nested field names", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  await cardUpdate.execute({
    id: "card_1",
    spendLimitAmount: 500000,
    spendLimitCurrency: "USD",
    spendDuration: "MONTHLY",
    spendReason: "Team tools",
    lockAfterDate: "2026-12-31",
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/cards/card_1");
  assertEquals(bodyOf(calls[0]), {
    spend_controls: {
      spend_limit: { amount: 500000, currency: "USD" },
      spend_duration: "MONTHLY",
      reason: "Team tools",
      lock_after_date: "2026-12-31",
    },
  });
});

Deno.test("card-update: metadata alone sends no spend_controls block", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  await cardUpdate.execute({ id: "card_1", metadata: '{"team": "platform"}' }, ctx);

  assertEquals(bodyOf(calls[0]), { metadata: { team: "platform" } });
});

Deno.test("card-update: a merchant list is parsed from JSON into BREX's [{name}] shape", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  await cardUpdate.execute({
    id: "card_1",
    allowedMerchants: '[{"name": "Github"}, {"name": " AWS "}]',
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    spend_controls: { allowed_merchant_details: [{ name: "Github" }, { name: "AWS" }] },
  });
});

/**
 * "Cannot be used together", per Brex — so the request is wrong before it is
 * sent, and no call is made.
 */
Deno.test("card-update: allowed and blocked merchants together are refused locally", async () => {
  const { ctx, calls } = mockCtx([{ body: CARD }]);
  let message = "";
  try {
    await cardUpdate.execute({
      id: "card_1",
      allowedMerchants: '[{"name": "Github"}]',
      blockedMerchants: '[{"name": "Apple"}]',
    }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/does not accept allowed and blocked merchants together/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("card-update: the documented 50-merchant maximum is enforced", () => {
  assertEquals(MAX_MERCHANTS, 50);
  const fifty = JSON.stringify(Array.from({ length: 50 }, (_, i) => ({ name: `m${i}` })));
  assertEquals(merchantList(fifty, "Allowed merchants")?.length, 50);

  const fiftyOne = JSON.stringify(Array.from({ length: 51 }, (_, i) => ({ name: `m${i}` })));
  let message = "";
  try {
    merchantList(fiftyOne, "Allowed merchants");
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/at most 50/.test(message), message);
});

Deno.test("card-update: a malformed merchant entry is refused with its index", () => {
  let message = "";
  try {
    merchantList('[{"name": "Github"}, {"nope": "AWS"}]', "Allowed merchants");
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/Allowed merchants\[1\]/.test(message), message);

  let notArray = "";
  try {
    merchantList('{"name": "Github"}', "Allowed merchants");
  } catch (err) {
    notArray = (err as Error).message;
  }
  assert(/must be a JSON array/.test(notArray), notArray);
});

/** Brex requires `amount` inside spend_limit, so a lone currency is unbuildable. */
Deno.test("card-update: a currency without an amount is refused locally", () => {
  let message = "";
  try {
    buildSpendControls({ id: "card_1", spendLimitCurrency: "USD" });
  } catch (err) {
    message = (err as Error).message;
  }
  assert(/needs a spend limit amount/.test(message), message);
  assertEquals(buildSpendControls({ id: "card_1" }), undefined);
});

Deno.test("card-update: it is a perform declared idempotent, and forwards an idempotency key", async () => {
  assertEquals(cardUpdate.type, "perform");
  assertEquals(cardUpdate.idempotent, true);

  const { ctx, calls } = mockCtx([{ body: CARD }]);
  await cardUpdate.execute({ id: "card_1", spendReason: "x", idempotencyKey: "k1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "k1");
});
