import { assertEquals } from "@std/assert";
import pageLeadList from "../../actions/page-lead-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("page-lead-list: calls GET /pages/{id}/leads with no count param", async () => {
  const { ctx, calls } = mockCtx([{ body: { leads: [] } }]);
  await pageLeadList.execute({ pageId: "p1", sortOrder: "desc", limit: 10 }, ctx);

  assertEquals(pathOf(calls[0].url), "/pages/p1/leads");
  assertEquals(queryOf(calls[0].url), { sort_order: "desc", limit: "10" });
});
