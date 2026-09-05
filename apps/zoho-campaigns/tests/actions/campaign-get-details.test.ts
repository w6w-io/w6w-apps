import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get-details.ts";

Deno.test("campaign-get-details: GETs getcampaigndetails with the campaign key and type", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", campaign_status: "Sent" } },
  ]);
  const out = await action.execute({ campaignKey: "abc", campaignType: "normal" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/getcampaigndetails");
  assertEquals(url.searchParams.get("campaignkey"), "abc");
  assertEquals(url.searchParams.get("campaigntype"), "normal");
  assertEquals(out, { data: { status: "success", code: "0", campaign_status: "Sent" } });
});
