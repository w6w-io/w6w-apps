import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-send.ts";

Deno.test("campaign-send: POSTs sendcampaign and unwraps the nested response envelope", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    {
      body: {
        response: {
          uri: "/api/v1.1/sendcampaign",
          code: "200",
          message: "",
          campaign_status: "inprogress",
        },
      },
    },
  ]);
  const out = await action.execute({ campaignKey: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/sendcampaign");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("campaignkey"), "abc");
  assertEquals(out, { message: "", campaignStatus: "inprogress" });
});

Deno.test("campaign-send: also reads a flat (non-nested) envelope", async () => {
  const { ctx } = mockCampaignsCtx([
    { body: { message: "ok", campaign_status: "inprogress", code: "200" } },
  ]);
  const out = await action.execute({ campaignKey: "abc" }, ctx);
  assertEquals(out, { message: "ok", campaignStatus: "inprogress" });
});
