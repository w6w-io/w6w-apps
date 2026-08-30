import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-create: POSTs userIds as [] when unset (the vendor field is required)", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "task_1" }) }]);
  await taskCreate.execute({ taskBoardId: "tb_1", title: "Sweep floor", status: "draft" }, ctx);
  assertEquals(pathOf(calls[0].url), "/tasks/v1/taskboards/tb_1/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { userIds: [], title: "Sweep floor", status: "draft" });
});

Deno.test("task-create: passes userIds and wraps description as {content}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "task_1" }) }]);
  await taskCreate.execute(
    {
      taskBoardId: "tb_1",
      title: "Sweep floor",
      status: "published",
      userIds: "1,2",
      description: "Every aisle",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    userIds: [1, 2],
    title: "Sweep floor",
    status: "published",
    description: { content: "Every aisle" },
  });
});

Deno.test("task-create: not idempotent", () => {
  assertEquals(taskCreate.idempotent, false);
});
