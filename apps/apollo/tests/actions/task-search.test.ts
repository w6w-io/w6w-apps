import { assertEquals } from "@std/assert";
import taskSearch from "../../actions/task-search.ts";
import { mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("task-search: POSTs to /tasks/search with query params, array for open_factor_names", async () => {
  const { ctx, calls } = mockCtx([
    { body: { tasks: [{ id: "t1" }], pagination: { total_entries: 1 } } },
  ]);
  const out = await taskSearch.execute({ open_factor_names: "overdue,scheduled" }, ctx) as {
    tasks: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/tasks/search");
  assertEquals(queryAllOf(calls[0].url, "open_factor_names[]"), ["overdue", "scheduled"]);
  assertEquals(out.tasks.length, 1);
});
