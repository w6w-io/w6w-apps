import { assertEquals } from "@std/assert";
import discountList from "../../actions/discount-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("discount-list: hits GET /discounts, filterable by code", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "di_1" }]) }]);
  await discountList.execute({ code: "EARLYBIRD" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/discounts");
  assertEquals(queryOf(calls[0].url), { code: "EARLYBIRD" });
});
