import { assertEquals } from "@std/assert";
import taskUpdate from "../../actions/task-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-update: PUTs the full replacement body to the specific task", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "task_1", status: "completed", droppedUserIds: [] }) },
  ]);
  const out = await taskUpdate.execute(
    { taskBoardId: "tb_1", taskId: "task_1", title: "Sweep floor", status: "completed" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/tasks/v1/taskboards/tb_1/tasks/task_1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    userIds: [],
    title: "Sweep floor",
    status: "completed",
  });
  assertEquals(out, { id: "task_1", status: "completed", droppedUserIds: [] });
});

Deno.test("task-update: idempotent", () => {
  assertEquals(taskUpdate.idempotent, true);
});
