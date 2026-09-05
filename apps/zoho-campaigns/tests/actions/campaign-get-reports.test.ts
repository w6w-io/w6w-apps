import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-get-reports.ts";

Deno.test("campaign-get-reports: GETs campaignreports with the campaign key", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { status: "success", code: "0", "campaign-reach": [{ total: "1" }] } },
  ]);
  const out = await action.execute({ campaignKey: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/campaignreports");
  assertEquals(url.searchParams.get("campaignkey"), "abc");
  assertEquals(out, { data: { status: "success", code: "0", "campaign-reach": [{ total: "1" }] } });
});
