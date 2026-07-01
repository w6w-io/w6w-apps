import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

Deno.test("get-campaign: GETs /campaigns/{id}/", async () => {
  const body = { data: { type: "campaign", id: "c-1" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ campaignId: "c-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/campaigns/c-1/");
  assertEquals(result, body);
});
