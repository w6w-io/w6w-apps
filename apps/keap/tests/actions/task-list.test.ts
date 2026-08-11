import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = { tasks: [{ id: "1", title: "Call back" }], next_page_token: "n" };

Deno.test("task-list: reads the tasks collection", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await taskList.execute({}, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/tasks");
  assertEquals(out.count, 1);
});

/**
 * "Tasks which are not assigned to a User may be queried with
 * `user_id==UNASSIGNED`" — a documented sentinel, and the only way to find
 * them.
 */
Deno.test("task-list: the UNASSIGNED sentinel is passed through as an id", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await taskList.execute({ userId: "UNASSIGNED" }, ctx);
  assertEquals(queryOf(calls[0].url).filter, "user_id==UNASSIGNED");
});

Deno.test("task-list: completion, priority and the due window build their own clauses", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await taskList.execute(
    { isCompleted: "false", priority: "CRITICAL", sinceTime: "2026-01-01T00:00:00.000Z" },
    ctx,
  );
  assertEquals(
    queryOf(calls[0].url).filter,
    "is_completed==false;priority==CRITICAL;since_time==2026-01-01T00:00:00.000Z",
  );
});

Deno.test("task-list: custom fields are requested through the only value Keap accepts", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }, { body: PAGE }]);
  await taskList.execute({ includeCustomFields: true }, ctx);
  assertEquals(queryOf(calls[0].url).fields, "custom_fields");
  await taskList.execute({ includeCustomFields: false }, ctx);
  assertEquals(queryOf(calls[1].url).fields, undefined);
});
