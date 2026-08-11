import { assertEquals } from "@std/assert";
import taskGet from "../../actions/task-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TASK = {
  task_id: 5,
  text: "Call Acme",
  status: "active",
  push: { channel: "/task/5", signature: "sig", timestamp: 1 },
  ref: { type: "item", id: 9, title: "Acme Ltd" },
  labels: [{ label_id: 1, text: "urgent" }],
};

Deno.test("task-get: GETs the task", async () => {
  const { ctx, calls } = mockCtx([{ body: TASK }]);
  const out = await taskGet.execute({ taskId: "5" }, ctx) as { task: Record<string, unknown> };
  assertEquals(pathOf(calls[0].url), "/task/5");
  assertEquals(out.task.task_id, 5);
  assertEquals(out.task.ref, { type: "item", id: 9, title: "Acme Ltd" });
  assertEquals(out.task.labels, [{ label_id: 1, text: "urgent" }]);
});

Deno.test("task-get: the push channel signature is stripped", async () => {
  const { ctx } = mockCtx([{ body: TASK }]);
  const out = await taskGet.execute({ taskId: "5" }, ctx) as { task: Record<string, unknown> };
  assertEquals(out.task.push, undefined);
});

Deno.test("task-get: an empty body yields an empty object", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await taskGet.execute({ taskId: "5" }, ctx), { task: {} });
});
