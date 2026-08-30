import { assertEquals } from "@std/assert";
import taskLinkConversation from "../../actions/task-link-conversation.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("task-link-conversation: POSTs /v1/tasks/{taskId}/link-conversation with conversationId", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { taskId: "TK1", revision: "2" } },
  }]);
  await taskLinkConversation.execute({ taskId: "TK1", conversationId: "CN1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/TK1/link-conversation");
  assertEquals(JSON.parse(calls[0].body!), { conversationId: "CN1" });
});

Deno.test("task-link-conversation: is an idempotent perform action", () => {
  assertEquals(taskLinkConversation.type, "perform");
  assertEquals(taskLinkConversation.idempotent, true);
});
