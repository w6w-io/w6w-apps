import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-complete.ts";

Deno.test("chat-complete: POSTs to /chat/completions with model + messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cmpl-1", choices: [] } }]);
  await action.execute!(
    {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "hi" }],
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/chat/completions");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "llama-3.3-70b-versatile");
  assertEquals(body.messages, [{ role: "user", content: "hi" }]);
});

Deno.test("chat-complete: forwards optional params using snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.2,
      topP: 0.9,
      maxCompletionTokens: 128,
      user: "u1",
      seed: 42,
      responseFormat: "json_object",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.temperature, 0.2);
  assertEquals(body.top_p, 0.9);
  assertEquals(body.max_completion_tokens, 128);
  assertEquals(body.user, "u1");
  assertEquals(body.seed, 42);
  assertEquals(body.response_format, { type: "json_object" });
});

Deno.test("chat-complete: omits optional params when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "hi" }] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("temperature" in body, false);
  assertEquals("top_p" in body, false);
  assertEquals("max_completion_tokens" in body, false);
  assertEquals("response_format" in body, false);
  // Deliberately never sent — Groq documents these as having no effect on
  // any current model, so this action does not model them as real controls.
  assertEquals("frequency_penalty" in body, false);
  assertEquals("presence_penalty" in body, false);
  assertEquals("logit_bias" in body, false);
});

Deno.test("chat-complete: forwards tools, tool_choice and parallel_tool_calls", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const tools = [
    { type: "function", function: { name: "get_weather", parameters: { type: "object" } } },
  ];
  await action.execute!(
    {
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: "weather?" }],
      tools,
      toolChoice: "required",
      parallelToolCalls: false,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tools, tools);
  assertEquals(body.tool_choice, "required");
  assertEquals(body.parallel_tool_calls, false);
});

Deno.test("chat-complete: json_schema response format carries the schema", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const jsonSchema = { name: "answer", schema: { type: "object" }, strict: true };
  await action.execute!(
    {
      model: "llama-3.3-70b-versatile",
      messages: [],
      responseFormat: "json_schema",
      jsonSchema,
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).response_format, {
    type: "json_schema",
    json_schema: jsonSchema,
  });
});

Deno.test("chat-complete: json_schema without a schema rejects before the request", async () => {
  const { ctx, calls } = mockCtx();
  let threw = false;
  try {
    await action.execute!(
      { model: "llama-3.3-70b-versatile", messages: [], responseFormat: "json_schema" },
      ctx,
    );
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message.includes("jsonSchema"), true);
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

// ── Groq-specific controls — no OpenAI equivalent ───────────────────────────

Deno.test("chat-complete: forwards service_tier, reasoning controls, and Compound config", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const searchSettings = { include_domains: ["example.com"] };
  const compoundCustom = { models: { tool_use_model: "llama-3.3-70b-versatile" } };
  await action.execute!(
    {
      model: "groq/compound",
      messages: [{ role: "user", content: "search this" }],
      serviceTier: "flex",
      reasoningEffort: "high",
      reasoningFormat: "parsed",
      searchSettings,
      compoundCustom,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.service_tier, "flex");
  assertEquals(body.reasoning_effort, "high");
  assertEquals(body.reasoning_format, "parsed");
  assertEquals(body.search_settings, searchSettings);
  assertEquals(body.compound_custom, compoundCustom);
});

Deno.test("chat-complete: Groq-specific fields are omitted entirely when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "llama-3.3-70b-versatile", messages: [] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("service_tier" in body, false);
  assertEquals("reasoning_effort" in body, false);
  assertEquals("reasoning_format" in body, false);
  assertEquals("search_settings" in body, false);
  assertEquals("compound_custom" in body, false);
});
