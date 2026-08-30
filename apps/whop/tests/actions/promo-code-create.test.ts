import { assertEquals } from "@std/assert";
import promoCodeCreate from "../../actions/promo-code-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("promo-code-create: POSTs the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "promo_1", code: "AFFILIATE25" } }]);
  await promoCodeCreate.execute(
    {
      accountId: "biz_1",
      code: "AFFILIATE25",
      promoType: "percentage",
      amountOff: 25,
      promoDurationMonths: 3,
      newUsersOnly: true,
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/promo_codes");
  assertEquals(JSON.parse(calls[0].body!), {
    account_id: "biz_1",
    code: "AFFILIATE25",
    promo_type: "percentage",
    amount_off: 25,
    promo_duration_months: 3,
    new_users_only: true,
  });
});

Deno.test("promo-code-create: amount_off hint documents the write/read unit mismatch", () => {
  const p = promoCodeCreate.params?.find((p) => p.key === "amountOff");
  const hint = p?.hint ?? "";
  assertEquals(hint.includes("25"), true);
  assertEquals(hint.includes("0.25"), true);
});
