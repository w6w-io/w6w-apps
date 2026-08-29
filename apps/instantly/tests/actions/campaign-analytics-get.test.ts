import { assertEquals } from "@std/assert";
import campaignAnalyticsGet from "../../actions/campaign-analytics-get.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-analytics-get: single id passes as ?id=", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ campaign_id: "c1", leads_count: 10 }] }]);
  await campaignAnalyticsGet.execute({ id: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/analytics");
  assertEquals(queryOf(calls[0].url), { id: "c1" });
});

Deno.test("campaign-analytics-get: several ids repeat the query key", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await campaignAnalyticsGet.execute({ ids: ["c1", "c2"] }, ctx);
  assertEquals(queryAllOf(calls[0].url, "ids"), ["c1", "c2"]);
});

Deno.test("campaign-analytics-get: empty id/ids means every campaign", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await campaignAnalyticsGet.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
