import { assertEquals } from "@std/assert";
import promoCodeDeactivate from "../../actions/promo-code-deactivate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("promo-code-deactivate: POSTs /promo_codes/{id}/deactivate with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "promo_1", status: "inactive" } }]);
  await promoCodeDeactivate.execute({ promoCodeId: "promo_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/promo_codes/promo_1/deactivate");
});
