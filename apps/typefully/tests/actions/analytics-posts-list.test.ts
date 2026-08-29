import { assertEquals } from "@std/assert";
import analyticsPostsList from "../../actions/analytics-posts-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("analytics-posts-list: fetches per-post metrics for a platform and date range", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope([{ platform: "x", post_id: "1", metrics: { impressions: 100 } }]),
  }]);
  await analyticsPostsList.execute({
    socialSetId: 4,
    platform: "x",
    startDate: "2026-02-01",
    endDate: "2026-02-27",
    includeReplies: false,
    limit: 25,
    offset: 0,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/analytics/x/posts");
  const q = queryOf(calls[0].url);
  assertEquals(q.start_date, "2026-02-01");
  assertEquals(q.end_date, "2026-02-27");
  assertEquals(q.include_replies, "false");
  assertEquals(q.limit, "25");
});

Deno.test("analytics-posts-list: only X is offered, per the vendor's own current limitation", () => {
  const platform = analyticsPostsList.params?.find((p) => p.key === "platform");
  assertEquals(platform?.options, [{ value: "x", label: "X" }]);
});
