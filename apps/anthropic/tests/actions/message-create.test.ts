import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-create.ts";

Deno.test("message-create: POSTs /v1/messages with model + messages + max_tokens + version", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "msg_1", role: "assistant" } }]);
  const result = await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 512,
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/messages");
  assertEquals(calls[0].headers["anthropic-version"], "2023-06-01");
  assertEquals(calls[0].headers["content-type"], "application/json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "claude-opus-4-1-20250805");
  assertEquals(body.messages, [{ role: "user", content: "hi" }]);
  assertEquals(body.max_tokens, 512);
  assertEquals((result as { id: string }).id, "msg_1");
});

Deno.test("message-create: forwards optional params using snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 128,
      system: "you are terse",
      temperature: 0.2,
      top_p: 0.9,
      top_k: 40,
      stop_sequences: ["END"],
      tools: [{ name: "search", input_schema: {} }],
      tool_choice: { type: "auto" },
      metadata: { user_id: "u1" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.system, "you are terse");
  assertEquals(body.temperature, 0.2);
  assertEquals(body.top_p, 0.9);
  assertEquals(body.top_k, 40);
  assertEquals(body.stop_sequences, ["END"]);
  assertEquals(body.tools?.[0]?.name, "search");
  assertEquals(body.tool_choice, { type: "auto" });
  assertEquals(body.metadata, { user_id: "u1" });
});

Deno.test("message-create: forwards the thinking block", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 128,
      thinking: { type: "enabled", budget_tokens: 2048 },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.thinking, { type: "enabled", budget_tokens: 2048 });
});

Deno.test("message-create: the thinking param documents the top_p/top_k/temperature conflict", () => {
  const hint = action.params?.find((p) => p.key === "thinking")?.hint ?? "";
  assertEquals(/top_p/.test(hint) && /top_k/.test(hint) && /temperature/.test(hint), true);
});

Deno.test("message-create: omits optional params when undefined", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "claude-opus-4-1-20250805",
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 128,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("system" in body, false);
  assertEquals("temperature" in body, false);
  assertEquals("stop_sequences" in body, false);
  assertEquals("tools" in body, false);
  assertEquals("thinking" in body, false);
  assertEquals(Object.keys(body).sort(), ["max_tokens", "messages", "model"]);
});

Deno.test("message-create: rejects stream: true", () => {
  const { ctx } = mockCtx();
  // Thrown synchronously: the guard runs before any request, and `execute` is
  // not `async` because nothing before it awaits. `ActionExecuteHook` returns
  // `O | Promise<O>` and the runtime awaits it either way, so a sync throw
  // fails the invocation just the same.
  assertThrows(
    () =>
      action.execute!(
        {
          model: "claude-opus-4-1-20250805",
          messages: [{ role: "user", content: "hi" }],
          max_tokens: 128,
          stream: true,
        },
        ctx,
      ),
    Error,
    "stream",
  );
});
