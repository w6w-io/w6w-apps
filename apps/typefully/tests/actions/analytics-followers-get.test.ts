import { assertEquals } from "@std/assert";
import analyticsFollowersGet from "../../actions/analytics-followers-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("analytics-followers-get: fetches the daily follower series", async () => {
  const { ctx, calls } = mockCtx([{
    body: { platform: "x", current_followers_count: 1450, data: [] },
  }]);
  const out = await analyticsFollowersGet.execute(
    { socialSetId: 4, platform: "x", startDate: "2026-01-01", endDate: "2026-01-31" },
    ctx,
  ) as { current_followers_count: number };
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/analytics/x/followers");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-01-01", end_date: "2026-01-31" });
  assertEquals(out.current_followers_count, 1450);
});

Deno.test("analytics-followers-get: start/end dates are optional and omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{
    body: { platform: "x", current_followers_count: 0, data: [] },
  }]);
  await analyticsFollowersGet.execute({ socialSetId: 4, platform: "x" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
