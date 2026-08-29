import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-update.ts";

Deno.test("task-update: sends only the provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "task_1" } }]);
  await action.execute!({ taskId: "task_1", notes: "call ahead" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks/task_1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { notes: "call ahead" });
});

Deno.test("task-update: taskId is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "taskId");
  assertEquals(calls.length, 0);
});

Deno.test("task-update: refuses an empty update rather than sending a no-op PUT", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ taskId: "task_1" }, ctx),
    Error,
    "no fields",
  );
  assertEquals(calls.length, 0);
});

Deno.test("task-update: container and metadata are parsed from JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    taskId: "task_1",
    container: '{"type":"WORKER","worker":"w1"}',
    metadata: '[{"name":"x","type":"string","value":"y"}]',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.container, { type: "WORKER", worker: "w1" });
  assertEquals(body.metadata, [{ name: "x", type: "string", value: "y" }]);
});

Deno.test("task-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
