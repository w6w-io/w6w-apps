import { assertEquals } from "@std/assert";
import messageFeedbackUpdate from "../../actions/message-feedback-update.ts";
import { mockCtx, pathOf, wrapped } from "../_helpers.ts";

Deno.test("message-feedback-update: PATCH .../feedback with positive", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ feedback: "positive" }) }]);
  const out = await messageFeedbackUpdate.execute(
    { agentId: "a1", conversationId: "c1", messageId: "m1", feedback: "positive" },
    ctx,
  ) as { feedback: string };

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/conversations/c1/messages/m1/feedback");
  assertEquals(JSON.parse(calls[0].body!), { feedback: "positive" });
  assertEquals(out.feedback, "positive");
});

Deno.test("message-feedback-update: 'clear' sends an explicit null, not an omitted field", async () => {
  const { ctx, calls } = mockCtx([{ body: wrapped({ feedback: null }) }]);
  await messageFeedbackUpdate.execute(
    { agentId: "a1", conversationId: "c1", messageId: "m1", feedback: "clear" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { feedback: null });
});
