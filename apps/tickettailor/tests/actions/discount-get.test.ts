import { assertEquals } from "@std/assert";
import discountGet from "../../actions/discount-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("discount-get: hits GET /discounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "di_1", code: "EARLYBIRD" } }]);
  const result = await discountGet.execute({ discountId: "di_1" }, ctx) as { code: string };
  assertEquals(pathOf(calls[0].url), "/v1/discounts/di_1");
  assertEquals(result.code, "EARLYBIRD");
});
