import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-delete.ts";

Deno.test("campaign-delete: GETs deletecampaign with the campaign key", async () => {
  const { ctx, calls } = mockCampaignsCtx([{
    body: { status: "success", code: "0", message: "success" },
  }]);
  const out = await action.execute({ campaignKey: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/deletecampaign");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("campaignkey"), "abc");
  assertEquals(out, { message: "success" });
});
