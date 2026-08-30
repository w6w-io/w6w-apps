import { assertEquals } from "@std/assert";
import agentChat from "../../actions/agent-chat.ts";
import { mockCtx, pathOf, wrapped } from "../_helpers.ts";

Deno.test("agent-chat: POST /agents/{id}/chat, always stream:false, unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    { body: wrapped({ id: "msg_1", role: "assistant", parts: [{ type: "text", text: "hi" }] }) },
  ]);
  const out = await agentChat.execute({ agentId: "a1", message: "Hello" }, ctx) as {
    id: string;
    role: string;
  };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/chat");
  assertEquals(JSON.parse(calls[0].body!), { message: "Hello", stream: false });
  assertEquals(out.id, "msg_1");
  assertEquals(out.role, "assistant");
});

Deno.test("agent-chat: forwards conversationId and userId, still forces stream:false", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ id: "msg_2" }) }]);
  await agentChat.execute(
    { agentId: "a1", message: "hi", conversationId: "c1", userId: "user_1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    message: "hi",
    conversationId: "c1",
    userId: "user_1",
    stream: false,
  });
});

Deno.test("agent-chat: message may be omitted (continuing after a tool result)", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ id: "msg_3" }) }]);
  await agentChat.execute({ agentId: "a1", conversationId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { conversationId: "c1", stream: false });
});
