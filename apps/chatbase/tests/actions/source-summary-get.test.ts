import { assertEquals } from "@std/assert";
import sourceSummaryGet from "../../actions/source-summary-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-summary-get: GET .../sources/summary, bare object", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      links: { count: 1, size: 100 },
      files: { count: 0, size: 0 },
      qnas: { count: 0, size: 0 },
      notionPages: { count: 0, size: 0 },
      texts: { count: 2, size: 500 },
      zendeskTickets: { count: 0, size: 0 },
      salesforceCases: { count: 0, size: 0 },
      shouldRetrain: true,
    },
  }]);
  const out = await sourceSummaryGet.execute({ agentId: "a1" }, ctx) as { shouldRetrain: boolean };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources/summary");
  assertEquals(out.shouldRetrain, true);
});
