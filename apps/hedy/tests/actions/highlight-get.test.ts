import { assert, assertEquals } from "@std/assert";
import highlightGet from "../../actions/highlight-get.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("highlight-get: calls GET /highlights/{id} and returns the detail payload", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "high_123456789",
        sessionId: "sess_123456789",
        timestamp: "2024-03-15T14:35:00Z",
        timeIndex: 300000,
        rawQuote: "yeah I think we should prioritize the mobile app release",
        cleanedQuote: "We should prioritize the mobile app release",
        aiInsight: "Key strategic decision regarding product development priorities",
        summary: "Decision made about product roadmap prioritization",
        createdAt: "2024-03-15T14:35:00Z",
      }),
    },
  ]);
  const out = await highlightGet.execute({ highlightId: "high_123456789" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/highlights/high_123456789");
  assertEquals(out.timeIndex, 300000);
  assertEquals(out.rawQuote, "yeah I think we should prioritize the mobile app release");
  assertEquals(out.aiInsight, "Key strategic decision regarding product development priorities");
});

Deno.test("highlight-get: a highlight id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "a/b" }) }]);
  await highlightGet.execute({ highlightId: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/highlights/a%2Fb");
});

Deno.test("highlight-get: a 404 for an unknown highlight throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not_found", "Highlight not found") }]);
  try {
    await highlightGet.execute({ highlightId: "does-not-exist" }, ctx);
    throw new Error("expected execute to reject");
  } catch (err) {
    assert(String((err as Error).message).includes("not_found"));
  }
});

Deno.test("highlight-get: requires a highlightId param", () => {
  const param = highlightGet.params?.find((p) => p.key === "highlightId");
  assertEquals(param?.required, true);
});
