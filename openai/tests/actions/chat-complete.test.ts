import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-complete.ts";

Deno.test("chat-complete: POSTs to /chat/completions with model + messages", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cmpl-1", choices: [] } }]);
  await action.execute!(
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hi" }],
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1/chat/completions");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "gpt-4o-mini");
  assertEquals(body.messages, [{ role: "user", content: "hi" }]);
});

Deno.test("chat-complete: forwards optional params using snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "gpt-4o",
      messages: [{ role: "user", content: "hi" }],
      temperature: 0.2,
      topP: 0.9,
      n: 2,
      maxTokens: 128,
      frequencyPenalty: 0.1,
      presencePenalty: 0.2,
      user: "u1",
      seed: 42,
      responseFormat: "json_object",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.temperature, 0.2);
  assertEquals(body.top_p, 0.9);
  assertEquals(body.n, 2);
  assertEquals(body.max_tokens, 128);
  assertEquals(body.frequency_penalty, 0.1);
  assertEquals(body.presence_penalty, 0.2);
  assertEquals(body.user, "u1");
  assertEquals(body.seed, 42);
  assertEquals(body.response_format, { type: "json_object" });
});

Deno.test("chat-complete: omits optional params when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "gpt-4o-mini", messages: [{ role: "user", content: "hi" }] },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("temperature" in body, false);
  assertEquals("top_p" in body, false);
  assertEquals("max_tokens" in body, false);
  assertEquals("response_format" in body, false);
});
