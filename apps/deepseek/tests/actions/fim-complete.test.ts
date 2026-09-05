import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/fim-complete.ts";

Deno.test("fim-complete: POSTs /beta/completions with model + prompt only", async () => {
  const body = { id: "cmpl-1", choices: [{ text: "hello" }] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { model: "deepseek-v4-pro", prompt: "def add(a, b):\n    return " },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.deepseek.com");
  assertEquals(url.pathname, "/beta/completions");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    model: "deepseek-v4-pro",
    prompt: "def add(a, b):\n    return ",
  });
  assertEquals(result, body);
});

Deno.test("fim-complete: forwards suffix and sampling params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "deepseek-v4-pro",
      prompt: "def add(a, b):\n    return ",
      suffix: "\n\nprint(add(1, 2))",
      maxTokens: 64,
      stop: ["\n\n"],
      temperature: 0.2,
      topP: 0.95,
      echo: true,
      logprobs: 5,
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.suffix, "\n\nprint(add(1, 2))");
  assertEquals(sent.max_tokens, 64);
  assertEquals(sent.stop, ["\n\n"]);
  assertEquals(sent.temperature, 0.2);
  assertEquals(sent.top_p, 0.95);
  assertEquals(sent.echo, true);
  assertEquals(sent.logprobs, 5);
});

Deno.test("fim-complete: omits undefined optional params from the request body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "deepseek-v4-pro", prompt: "x" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(sent).sort(), ["model", "prompt"]);
});

Deno.test("fim-complete: is marked non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
