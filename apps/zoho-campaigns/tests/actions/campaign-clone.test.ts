import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-clone.ts";

Deno.test("campaign-clone: POSTs json/clonecampaign with campaigninfo JSON-encoded", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", "campaign-details": [{ campaign_name: "Sample1" }] } },
  ]);
  const out = await action.execute(
    { campaignInfo: { campaignname: "Sample1", subject: "Sam1ple", oldcampaignkey: "abc" } },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/json/clonecampaign");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(url.searchParams.get("campaigninfo")!), {
    campaignname: "Sample1",
    subject: "Sam1ple",
    oldcampaignkey: "abc",
  });
  assertEquals(out, {
    data: { status: "success", code: "0", "campaign-details": [{ campaign_name: "Sample1" }] },
  });
});
