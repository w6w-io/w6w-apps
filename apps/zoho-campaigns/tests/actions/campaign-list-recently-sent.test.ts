import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-list-recently-sent.ts";

Deno.test("campaign-list-recently-sent: GETs recentsentcampaigns with the required limit", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        status: "success",
        code: "0",
        recent_sent_campaigns: [{ campaign_key: "abc", campaign_name: "CAMPAIG" }],
      },
    },
  ]);
  const out = await action.execute({ limit: 3 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/recentsentcampaigns");
  assertEquals(url.searchParams.get("limit"), "3");
  assertEquals(out, { campaigns: [{ campaign_key: "abc", campaign_name: "CAMPAIG" }] });
});
