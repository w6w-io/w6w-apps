import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/chat-completion.ts";

Deno.test("chat-completion: POSTs /v1/chat/completions with model + messages only", async () => {
  const body = { id: "cmpl-1", choices: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      model: "mistral-large-latest",
      messages: [{ role: "user", content: "hi" }],
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/chat/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "mistral-large-latest",
    messages: [{ role: "user", content: "hi" }],
  });
  assertEquals(result, body);
});

Deno.test("chat-completion: forwards optional params with snake_case keys", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "mistral-small-latest",
      messages: [{ role: "user", content: "x" }],
      temperature: 0.7,
      topP: 0.95,
      maxTokens: 128,
      stop: ["\n\n"],
      randomSeed: 42,
      responseFormat: "json_object",
      safePrompt: true,
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.temperature, 0.7);
  assertEquals(sent.top_p, 0.95);
  assertEquals(sent.max_tokens, 128);
  assertEquals(sent.stop, ["\n\n"]);
  assertEquals(sent.random_seed, 42);
  assertEquals(sent.response_format, { type: "json_object" });
  assertEquals(sent.safe_prompt, true);
});

Deno.test("chat-completion: omits undefined optional params from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { model: "m", messages: [{ role: "user", content: "x" }] },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["messages", "model"]);
});
