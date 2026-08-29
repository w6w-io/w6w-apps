import { assertEquals } from "@std/assert";
import campaignAnalyticsOverviewGet from "../../actions/campaign-analytics-overview-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-analytics-overview-get: GETs /campaigns/analytics/overview", async () => {
  const { ctx, calls } = mockCtx([{ body: { open_count: 5 } }]);
  const out = await campaignAnalyticsOverviewGet.execute(
    { start_date: "2026-01-01", expand_crm_events: true },
    ctx,
  ) as { open_count: number };

  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/analytics/overview");
  assertEquals(queryOf(calls[0].url), { start_date: "2026-01-01", expand_crm_events: "true" });
  assertEquals(out.open_count, 5);
});

Deno.test("campaign-analytics-overview-get: expand_crm_events defaults to unset (vendor default false)", () => {
  const p = campaignAnalyticsOverviewGet.params?.find((p) => p.key === "expand_crm_events");
  assertEquals(p?.default, undefined);
});
