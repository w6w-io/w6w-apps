import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/answer.ts";

Deno.test("answer: POSTs /answer with the query and stream forced false", async () => {
  const body = { requestId: "r1", answer: "$350 billion.", citations: [] };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ query: "What is SpaceX worth?" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/answer");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, "What is SpaceX worth?");
  assertEquals(sent.stream, false);
  assertEquals(result, body);
});

Deno.test("answer: forwards model, systemPrompt, userLocation and outputSchema", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: "r1", answer: "x", citations: [] } }]);
  await action.execute!(
    {
      query: "x",
      model: "exa-pro",
      systemPrompt: "Prefer official sources.",
      userLocation: "US",
      outputSchema: { type: "object", properties: { a: { type: "string" } } },
    },
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.model, "exa-pro");
  assertEquals(sent.systemPrompt, "Prefer official sources.");
  assertEquals(sent.userLocation, "US");
  assertEquals(sent.outputSchema, { type: "object", properties: { a: { type: "string" } } });
});
