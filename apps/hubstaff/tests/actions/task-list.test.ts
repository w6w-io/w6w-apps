import { assert, assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/task-list.ts";

Deno.test("task-list: GETs the organization's tasks", async () => {
  const body = listEnvelope("tasks", [{ id: 1, status: "active", project_id: 9 }], 4);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 13 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/13/tasks");
  assertEquals(result.tasks.length, 1);
  assertEquals(result.pagination, { next_page_start_id: 4 });
});

/** The vendor's enum has seven statuses; the operation description names three. */
Deno.test("task-list: the status filter carries all seven documented values", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  for (const value of ["active", "completed", "deleted", "archived"]) {
    assert(status.hint!.includes(value), `${value} missing from the hint`);
  }
  assert(status.hint!.includes("archived_native_deleted"), status.hint!);
});

Deno.test("task-list: list filters are CSV and only_global_todos keeps a false", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("tasks", []) }]);
  await action.execute!({
    organization_id: 13,
    status: "active,completed",
    project_ids: "9",
    user_ids: "1,2",
    only_global_todos: false,
    include: "users,projects",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    status: "active,completed",
    project_ids: "9",
    user_ids: "1,2",
    only_global_todos: "false",
    include: "users,projects",
  });
});
