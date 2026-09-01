import { assertEquals } from "@std/assert";
import windowPageQuery from "../../actions/window-page-query.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-page-query: posts the prompt and an outputSchema STRING under configuration", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope("This page is an example.") }]);
  const schema = '{"type":"object","properties":{"answer":{"type":"string"}}}';
  const out = await windowPageQuery.execute(
    { sessionId: "s1", windowId: "w1", prompt: "What is this page about?", outputSchema: schema },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/page-query");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.prompt, "What is this page about?");
  // outputSchema travels as a STRING, never parsed into an object.
  assertEquals(typeof body.configuration.outputSchema, "string");
  assertEquals(body.configuration.outputSchema, schema);
  assertEquals((out as { modelResponse: string }).modelResponse, "This page is an example.");
});

Deno.test("window-page-query: omits configuration entirely when outputSchema is empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope("An answer.") }]);
  await windowPageQuery.execute({ sessionId: "s1", windowId: "w1", prompt: "What is this?" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { prompt: "What is this?" });
});
