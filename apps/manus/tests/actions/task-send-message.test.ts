import { assertEquals } from "@std/assert";
import taskSendMessage from "../../actions/task-send-message.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("task-send-message: posts task_id and message content", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskSendMessage.execute({ taskId: "t1", content: "continue" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/task.sendMessage");
  assertEquals(JSON.parse(calls[0].body!), {
    task_id: "t1",
    message: { content: "continue" },
  });
});

Deno.test("task-send-message: a non-empty connectors override is sent as connectors, distinct from clearConnectors", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskSendMessage.execute({ taskId: "t1", content: "hi", connectors: ["gmail"] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.connectors, ["gmail"]);
  assertEquals(body.clear_connectors, undefined);
});

Deno.test("task-send-message: clearConnectors is sent explicitly when true", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ task_id: "t1" }) }]);
  await taskSendMessage.execute({ taskId: "t1", content: "hi", clearConnectors: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.clear_connectors, true);
  assertEquals(body.message.connectors, undefined);
});

Deno.test("task-send-message: is not idempotent — retrying risks a duplicated instruction", () => {
  assertEquals(taskSendMessage.idempotent, false);
});
