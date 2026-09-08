import { assertEquals } from "@std/assert";
import rowsList from "../../actions/rows-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("rows-list: reads data + continuation, and forwards limit/continuation as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ fullName: "Ada" }], continuation: "tok" } }]);
  const out = await rowsList.execute({ tableId: "t1", limit: 50, continuation: "prev" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables/t1/rows");
  assertEquals(queryOf(calls[0].url), { limit: "50", continuation: "prev" });
  assertEquals(out, { data: [{ fullName: "Ada" }], continuation: "tok" });
});

Deno.test("rows-list: continuation is absent on the last page", async () => {
  const { ctx } = mockCtx([{ body: { data: [] } }]);
  const out = await rowsList.execute({ tableId: "t1" }, ctx);
  assertEquals(out.continuation, undefined);
});
