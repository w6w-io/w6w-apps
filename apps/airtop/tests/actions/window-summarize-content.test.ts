import { assertEquals } from "@std/assert";
import windowSummarizeContent from "../../actions/window-summarize-content.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("window-summarize-content: prompt is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope("A short summary.") }]);
  const out = await windowSummarizeContent.execute({ sessionId: "s1", windowId: "w1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/summarize-content");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals((out as { modelResponse: string }).modelResponse, "A short summary.");
});

Deno.test("window-summarize-content: an optional prompt is sent when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope("A short summary.") }]);
  await windowSummarizeContent.execute(
    { sessionId: "s1", windowId: "w1", prompt: "Keep it to two sentences." },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { prompt: "Keep it to two sentences." });
});
