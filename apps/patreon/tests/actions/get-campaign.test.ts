import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

Deno.test("get-campaign: GETs /campaigns/{id}", async () => {
  const body = { data: { id: "12345", type: "campaign" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ campaignId: "12345", include: "tiers" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/campaigns/12345");
  assertEquals(url.searchParams.get("include"), "tiers");
  assertEquals(out, body);
});

Deno.test("get-campaign: URL-encodes the campaign id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ campaignId: "abc/def" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/oauth2/v2/campaigns/abc%2Fdef");
});
