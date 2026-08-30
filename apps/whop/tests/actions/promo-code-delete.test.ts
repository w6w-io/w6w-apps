import { assertEquals } from "@std/assert";
import promoCodeDelete from "../../actions/promo-code-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("promo-code-delete: DELETEs /promo_codes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "promo_1", deleted: true } }]);
  await promoCodeDelete.execute({ promoCodeId: "promo_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/promo_codes/promo_1");
});
