import { assertEquals } from "@std/assert";
import createTask from "../../actions/create-task.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-task: POSTs /v1/tasks", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: item("45", "task", { name: "A brand new task" }),
  }]);
  const out = await createTask.execute({ name: "A brand new task" }, ctx) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/tasks");
  assertEquals(JSON.parse(calls[0].body!), { name: "A brand new task" });
  assertEquals(out.id, "45");
});

Deno.test("create-task: splits comma-separated user IDs into an array and attaches an association", async () => {
  const { ctx, calls } = mockCtx([{ body: item("46", "task", {}) }]);
  await createTask.execute({
    name: "Follow up",
    priority: "high",
    taskableType: "Prospect",
    taskableId: "74",
    userIds: "1, 2,3",
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.priority, "high");
  assertEquals(body.taskable_type, "Prospect");
  assertEquals(body.taskable_id, "74");
  assertEquals(body.user_ids, ["1", "2", "3"]);
});

Deno.test("create-task: is marked non-idempotent", () => {
  assertEquals(createTask.idempotent, false);
});
