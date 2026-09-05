import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list.ts";

Deno.test("campaign-list: sends page, include_archived and the last-edit filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { campaigns: [] } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    page: 2,
    includeArchived: true,
    sortDirection: "asc",
    lastEditTimeGt: "2026-01-01T00:00:00Z",
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/campaigns/list");
  assertEquals(q.get("page"), "2");
  assertEquals(q.get("include_archived"), "true");
  assertEquals(q.get("sort_direction"), "asc");
  assertEquals(q.get("last_edit.time[gt]"), "2026-01-01T00:00:00Z");
});
