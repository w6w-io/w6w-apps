import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-completion.ts";

Deno.test("chat-completion: POSTs /chat/completions with just messages by default", async () => {
  const body = { id: "gen-1", choices: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { messages: [{ role: "user", content: "hi" }] },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/chat/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    messages: [{ role: "user", content: "hi" }],
  });
  assertEquals(result, body);
});

Deno.test("chat-completion: forwards model and sampling params with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "openai/gpt-5.2",
      messages: [{ role: "user", content: "x" }],
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      repetitionPenalty: 1.1,
      minP: 0.05,
      topA: 0.2,
      maxTokens: 128,
      seed: 42,
      stop: ["\n\n"],
      responseFormat: "json_object",
      logitBias: { "123": -100 },
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.model, "openai/gpt-5.2");
  assertEquals(sent.temperature, 0.7);
  assertEquals(sent.top_p, 0.95);
  assertEquals(sent.top_k, 40);
  assertEquals(sent.frequency_penalty, 0.1);
  assertEquals(sent.presence_penalty, 0.2);
  assertEquals(sent.repetition_penalty, 1.1);
  assertEquals(sent.min_p, 0.05);
  assertEquals(sent.top_a, 0.2);
  assertEquals(sent.max_tokens, 128);
  assertEquals(sent.seed, 42);
  assertEquals(sent.stop, ["\n\n"]);
  assertEquals(sent.response_format, { type: "json_object" });
  assertEquals(sent.logit_bias, { "123": -100 });
});

Deno.test("chat-completion: forwards tools, tool_choice and parallel_tool_calls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const tools = [{ type: "function", function: { name: "get_weather" } }];
  await action.execute!(
    {
      messages: [{ role: "user", content: "weather?" }],
      tools,
      toolChoice: "auto",
      parallelToolCalls: false,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tools, tools);
  assertEquals(body.tool_choice, "auto");
  assertEquals(body.parallel_tool_calls, false);
});

Deno.test("chat-completion: forwards OpenRouter-only routing fields", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const provider = { order: ["OpenAI"], allow_fallbacks: false };
  await action.execute!(
    {
      messages: [{ role: "user", content: "hi" }],
      plugins: [{ id: "web" }],
      models: ["openai/gpt-5.2", "anthropic/claude-sonnet-4.6"],
      route: "fallback",
      provider,
      user: "user-123",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.plugins, [{ id: "web" }]);
  assertEquals(body.models, ["openai/gpt-5.2", "anthropic/claude-sonnet-4.6"]);
  assertEquals(body.route, "fallback");
  assertEquals(body.provider, provider);
  assertEquals(body.user, "user-123");
});

Deno.test("chat-completion: omits unset optional params from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ messages: [] }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent), ["messages"]);
});
