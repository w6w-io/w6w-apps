import { assertEquals } from "@std/assert";
import promoCodeActivate from "../../actions/promo-code-activate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("promo-code-activate: POSTs /promo_codes/{id}/activate with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "promo_1", status: "active" } }]);
  await promoCodeActivate.execute({ promoCodeId: "promo_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/promo_codes/promo_1/activate");
  assertEquals(calls[0].body, null);
});
