import { assertEquals } from "@std/assert";
import funnelList from "../../actions/funnel-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("funnel-list: hits /api/funnels with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1, name: "Launch" }]) }]);
  await funnelList.execute({ query: "Launch", limit: 20 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/funnels");
  assertEquals(queryOf(calls[0].url), { query: "Launch", limit: "20" });
});
