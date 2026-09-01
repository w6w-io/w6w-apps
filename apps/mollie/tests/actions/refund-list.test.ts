import { assertEquals } from "@std/assert";
import refundList from "../../actions/refund-list.ts";
import { list, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("refund-list: unwraps _embedded.refunds account-wide, at /refunds", async () => {
  const { ctx, calls } = mockCtx([{ body: list("refunds", [{ id: "re_1" }, { id: "re_2" }]) }]);
  const out = await refundList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/refunds");
  assertEquals(out, { count: 2, items: [{ id: "re_1" }, { id: "re_2" }] });
});
