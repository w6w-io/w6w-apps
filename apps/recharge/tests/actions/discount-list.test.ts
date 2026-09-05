import { assertEquals } from "@std/assert";
import discountList from "../../actions/discount-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("discount-list: hits GET /discounts with the code filter", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("discounts", [{ id: 1 }]) }]);
  const out = await discountList.execute({ discountCode: "10PERCENTOFF" }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/discounts");
  assertEquals(queryOf(calls[0].url), { discount_code: "10PERCENTOFF" });
  assertEquals(out.items, [{ id: 1 }]);
});

Deno.test("discount-list: value_type is sent under its documented query name", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("discounts", []) }]);
  await discountList.execute({ valueType: "percentage" }, ctx);
  assertEquals(queryOf(calls[0].url), { value_type: "percentage" });
});
