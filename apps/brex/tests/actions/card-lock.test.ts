import { assertEquals } from "@std/assert";
import cardLock from "../../actions/card-lock.ts";
import { bodyOf, CARD, mockCtx, pathOf } from "../_helpers.ts";

const LOCKED = { ...CARD, status: "LOCKED" };

Deno.test("card-lock: POSTs the required reason and an optional description", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCKED }]);
  const result = await cardLock.execute({
    id: "card_1",
    reason: "CARD_LOST",
    description: "Reported missing 2026-09-22",
  }, ctx) as typeof LOCKED;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/cards/card_1/lock");
  assertEquals(bodyOf(calls[0]), {
    reason: "CARD_LOST",
    description: "Reported missing 2026-09-22",
  });
  assertEquals(result.status, "LOCKED");
});

Deno.test("card-lock: the reason is required and comes from Brex's seven-value enum", () => {
  const reason = cardLock.params?.find((p) => p.key === "reason");
  assertEquals(reason?.required, true);
  assertEquals((reason?.options as Array<{ value: string }>).map((o) => o.value), [
    "CARD_DAMAGED",
    "CARD_LOST",
    "CARD_NOT_RECEIVED",
    "DO_NOT_NEED_PHYSICAL_CARD",
    "DO_NOT_NEED_VIRTUAL_CARD",
    "FRAUD",
    "OTHER",
  ]);
});

Deno.test("card-lock: with no description only the reason is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: LOCKED }]);
  await cardLock.execute({ id: "card_1", reason: "OTHER" }, ctx);

  assertEquals(bodyOf(calls[0]), { reason: "OTHER" });
  assertEquals(calls[0].headers["idempotency-key"], undefined);
});

/** The target state is LOCKED either way, so a retry converges. */
Deno.test("card-lock: it is a perform declared idempotent", () => {
  assertEquals(cardLock.type, "perform");
  assertEquals(cardLock.idempotent, true);
});
