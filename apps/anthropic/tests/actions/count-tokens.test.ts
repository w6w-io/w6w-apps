import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/count-tokens.ts";

Deno.test("count-tokens: POSTs /v1/messages/count_tokens with model + messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { input_tokens: 42 } }]);
  const result = await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hello" }],
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages/count_tokens");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "claude-opus-4-1-20250805");
  assertEquals(body.messages, [{ role: "user", content: "hello" }]);
  assertEquals("max_tokens" in body, false, "max_tokens must not be sent to /count_tokens");
  assertEquals((result as { input_tokens: number }).input_tokens, 42);
});

Deno.test("count-tokens: forwards system + tools when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { input_tokens: 100 } }]);
  await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hi" }],
      system: "helpful",
      tools: [{ name: "t", input_schema: {} }],
      tool_choice: { type: "auto" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.system, "helpful");
  assertEquals(body.tools?.[0]?.name, "t");
  assertEquals(body.tool_choice, { type: "auto" });
});
