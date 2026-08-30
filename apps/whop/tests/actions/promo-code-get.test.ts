import { assertEquals } from "@std/assert";
import promoCodeGet from "../../actions/promo-code-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("promo-code-get: GETs /promo_codes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "promo_1", code: "AFFILIATE25" } }]);
  const out = await promoCodeGet.execute({ promoCodeId: "promo_1" }, ctx) as { code: string };
  assertEquals(pathOf(calls[0].url), "/promo_codes/promo_1");
  assertEquals(out.code, "AFFILIATE25");
});
