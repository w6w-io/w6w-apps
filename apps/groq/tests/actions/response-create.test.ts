import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-create.ts";

Deno.test("response-create: POSTs to /openai/v1/responses with model + input", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "resp_1" } }]);
  await action.execute!({ model: "llama-3.3-70b-versatile", input: "Say hi" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/responses");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.model, "llama-3.3-70b-versatile");
  assertEquals(body.input, "Say hi");
});

Deno.test("response-create: never sends `store` or `previous_response_id` — this API is stateless", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "llama-3.3-70b-versatile", input: "hi" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("store" in body, false);
  assertEquals("previous_response_id" in body, false);
});

Deno.test("response-create: forwards optional params using snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      model: "llama-3.3-70b-versatile",
      input: "hi",
      instructions: "Be terse.",
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 256,
      serviceTier: "flex",
      tools: [{ type: "function", function: { name: "f" } }],
      toolChoice: "auto",
      parallelToolCalls: false,
      reasoning: { effort: "high" },
      text: { format: { type: "text" } },
      truncation: "auto",
      user: "u1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.instructions, "Be terse.");
  assertEquals(body.temperature, 0.3);
  assertEquals(body.top_p, 0.8);
  assertEquals(body.max_output_tokens, 256);
  assertEquals(body.service_tier, "flex");
  assertEquals(body.tools, [{ type: "function", function: { name: "f" } }]);
  assertEquals(body.tool_choice, "auto");
  assertEquals(body.parallel_tool_calls, false);
  assertEquals(body.reasoning, { effort: "high" });
  assertEquals(body.text, { format: { type: "text" } });
  assertEquals(body.truncation, "auto");
  assertEquals(body.user, "u1");
});

Deno.test("response-create: omits optional params when not provided", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "llama-3.3-70b-versatile", input: "hi" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(Object.keys(body).sort(), ["input", "model"]);
});
