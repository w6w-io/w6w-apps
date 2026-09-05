import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-complete.ts";

Deno.test("chat-complete: POSTs /chat/completions with model + messages only", async () => {
  const body = { id: "cmpl-1", choices: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "hi" }],
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.deepseek.com");
  assertEquals(url.pathname, "/chat/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "deepseek-v4-pro",
    messages: [{ role: "user", content: "hi" }],
  });
  assertEquals(result, body);
});

Deno.test("chat-complete: omits undefined optional params from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "deepseek-v4-flash", messages: [{ role: "user", content: "x" }] },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["messages", "model"]);
});

Deno.test("chat-complete: thinking mode nests as { type }", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "deepseek-v4-pro",
      messages: [],
      thinking: "disabled",
      reasoningEffort: "max",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.thinking, { type: "disabled" });
  assertEquals(sent.reasoning_effort, "max");
});

Deno.test("chat-complete: forwards snake_case params, tools and logprobs", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const tools = [{ type: "function", function: { name: "get_weather" } }];
  await action.execute!(
    {
      model: "deepseek-v4-pro",
      messages: [{ role: "user", content: "weather?" }],
      maxTokens: 128,
      responseFormat: "json_object",
      stop: ["\n\n"],
      temperature: 0.7,
      topP: 0.9,
      tools,
      toolChoice: "auto",
      logprobs: true,
      topLogprobs: 5,
      userId: "u-123",
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.max_tokens, 128);
  assertEquals(sent.response_format, { type: "json_object" });
  assertEquals(sent.stop, ["\n\n"]);
  assertEquals(sent.temperature, 0.7);
  assertEquals(sent.top_p, 0.9);
  assertEquals(sent.tools, tools);
  assertEquals(sent.tool_choice, "auto");
  assertEquals(sent.logprobs, true);
  assertEquals(sent.top_logprobs, 5);
  assertEquals(sent.user_id, "u-123");
});

Deno.test("chat-complete: never sends frequency_penalty/presence_penalty (documented no-ops)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "deepseek-v4-pro", messages: [] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("frequency_penalty" in sent, false);
  assertEquals("presence_penalty" in sent, false);
});

Deno.test("chat-complete: is marked non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
