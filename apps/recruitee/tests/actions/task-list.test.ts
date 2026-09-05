import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: builds the query from every filter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tasks: [], meta: {}, references: [] } }]);
  await taskList.execute({
    scope: "my",
    status: "uncompleted",
    sortBy: "due_date",
    sortOrder: "asc",
    adminIds: [1, 2],
    page: 1,
    limit: 20,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/c/123/tasks");
  assertEquals(queryOf(calls[0].url), {
    scope: "my",
    status: "uncompleted",
    sort_by: "due_date",
    sort_order: "asc",
    admin_ids: "1,2",
    page: "1",
    limit: "20",
  });
});
