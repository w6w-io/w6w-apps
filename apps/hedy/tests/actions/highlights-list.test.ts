import { assert, assertEquals } from "@std/assert";
import highlightsList from "../../actions/highlights-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("highlights-list: calls GET /highlights and unwraps items + pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: listEnvelope(
        [{
          id: "high_1",
          sessionId: "sess_1",
          timestamp: "2024-03-15T14:35:00Z",
          cleanedQuote: "We should prioritize the mobile app release",
          summary: "Decision made about product roadmap prioritization",
        }],
        { hasMore: false, total: 75 },
      ),
    },
  ]);
  const out = await highlightsList.execute({ limit: 20 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/highlights");
  assertEquals(queryOf(calls[0].url).limit, "20");
  assertEquals((out.items as unknown[]).length, 1);
  assertEquals(out.hasMore, false);
  assertEquals(out.total, 75);
});

Deno.test("highlights-list: omitting limit sends no limit query param", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await highlightsList.execute({}, ctx);
  assert(!("limit" in queryOf(calls[0].url)));
});

Deno.test("highlights-list: a rate-limited response throws mentioning the vendor's code", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      body: {
        success: false,
        error: { code: "rate_limit_exceeded", message: "Too many requests" },
      },
    },
  ]);
  try {
    await highlightsList.execute({}, ctx);
    throw new Error("expected execute to reject");
  } catch (err) {
    assert(String((err as Error).message).includes("rate_limit_exceeded"));
  }
});
