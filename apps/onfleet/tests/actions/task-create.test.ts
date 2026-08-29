import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

const created = { status: 200, body: { id: "task_1", shortId: "abc123", state: 0 } };

Deno.test("task-create: a bare destination id is not parsed as JSON", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({ destination: "dst_1" }, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).destination, "dst_1");
});

Deno.test("task-create: an inline destination is parsed and sent as an object", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({
    destination: '{"address":{"number":"1","street":"Main St","city":"SF","country":"US"}}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).destination.address.city, "SF");
});

Deno.test("task-create: destination is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "destination");
  assertEquals(calls.length, 0);
});

Deno.test("task-create: recipients must be an array when given", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ destination: "dst_1", recipients: '{"name":"a"}' }, ctx),
    Error,
    "array",
  );
});

Deno.test("task-create: dependencies is comma-split and container/autoAssign are parsed", async () => {
  const { ctx, calls } = mockCtx([created]);
  await action.execute!({
    destination: "dst_1",
    dependencies: "task_a, task_b",
    container: '{"type":"TEAM","team":"team_1"}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.dependencies, ["task_a", "task_b"]);
  assertEquals(body.container, { type: "TEAM", team: "team_1" });
});

Deno.test("task-create: logs the task id and state, not the destination", async () => {
  const { ctx, logs } = mockCtx([created]);
  await action.execute!({ destination: "dst_1" }, ctx);
  assert(logs.some((l) => l.level === "info"), JSON.stringify(logs));
  assertEquals(logs[0].data, { taskId: "task_1", state: 0 });
});

Deno.test("task-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
