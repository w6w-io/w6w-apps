import { assertEquals } from "@std/assert";
import recurringTaskList from "../../actions/recurring-task-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

/**
 * The collection is named `tasks`, not `recurringTasks` — the same key the
 * ordinary task list uses, for a different kind of object. Reading
 * `recurringTasks` returns an empty page forever without erroring.
 */
Deno.test("recurring-task-list: reads the `tasks` key, which is what the vendor names it", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("tasks", [{ id: "r1", frequency: "weekly_any_day" }], { nextCursor: "c2" }) },
  ]);
  const out = await recurringTaskList.execute({ workspaceId: "ws1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/recurring-tasks");
  assertEquals(queryOf(calls[0].url), { workspaceId: "ws1" });
  assertEquals(out, {
    items: [{ id: "r1", frequency: "weekly_any_day" }],
    meta: { nextCursor: "c2", pageSize: 1 },
  });
});

/** Unlike tasks and projects, this endpoint requires a workspace. */
Deno.test("recurring-task-list: workspaceId is required here", () => {
  assertEquals(recurringTaskList.params?.find((p) => p.key === "workspaceId")?.required, true);
});
