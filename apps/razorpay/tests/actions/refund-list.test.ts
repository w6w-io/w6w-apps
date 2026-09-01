import { assertEquals } from "@std/assert";
import refundList from "../../actions/refund-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("refund-list: lists /refunds with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "rfnd_1" }]) }]);
  await refundList.execute({ count: 15 }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/refunds");
  assertEquals(queryOf(calls[0].url), { count: "15" });
});
