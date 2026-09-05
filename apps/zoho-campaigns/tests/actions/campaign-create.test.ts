import { assertEquals } from "@std/assert";
import { mockCampaignsCtx } from "../_helpers.ts";
import action from "../../actions/campaign-create.ts";

Deno.test("campaign-create: POSTs createCampaign with every field as a query param, listDetails JSON-encoded", async () => {
  const { ctx, calls } = mockCampaignsCtx([
    { body: { message: "Campaign created successfully", campaignKey: "10234695", code: "200" } },
  ]);
  const out = await action.execute(
    {
      campaignName: "newsletter",
      fromEmail: "patricia@zoho.com",
      subject: "festive offer",
      listDetails: { "34594177d382061b27dd314490758f5d": [] },
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1.1/createCampaign");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.searchParams.get("campaignname"), "newsletter");
  assertEquals(url.searchParams.get("from_email"), "patricia@zoho.com");
  assertEquals(url.searchParams.get("subject"), "festive offer");
  assertEquals(JSON.parse(url.searchParams.get("list_details")!), {
    "34594177d382061b27dd314490758f5d": [],
  });
  assertEquals(out, { message: "Campaign created successfully", campaignKey: "10234695" });
});
