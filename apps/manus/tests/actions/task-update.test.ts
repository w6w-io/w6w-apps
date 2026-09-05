import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("task-update: posts only the fields the caller set", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskUpdate.execute({ taskId: "t1", title: "New title" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/task.update");
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1", title: "New title" });
});

Deno.test("task-update: maps enableVisibleInTaskList to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskUpdate.execute({ taskId: "t1", enableVisibleInTaskList: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { task_id: "t1", enable_visible_in_task_list: false });
});

Deno.test("task-update: is idempotent", () => {
  assertEquals(taskUpdate.idempotent, true);
});
