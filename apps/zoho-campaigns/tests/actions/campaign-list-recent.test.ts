import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list-recent.ts";

Deno.test("campaign-list-recent: GETs recentcampaigns and returns recent_campaigns as campaigns", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        recent_campaigns: [{ campaign_key: "abc", campaign_name: "1222" }],
      },
    },
  ]);
  const out = await action.execute({ status: "drafts", sort: "desc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/recentcampaigns");
  assertEquals(url.searchParams.get("status"), "drafts");
  assertEquals(url.searchParams.get("sort"), "desc");
  assertEquals(out, { campaigns: [{ campaign_key: "abc", campaign_name: "1222" }] });
});
