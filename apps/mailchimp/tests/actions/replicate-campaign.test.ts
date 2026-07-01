import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/replicate-campaign.ts";

Deno.test("replicate-campaign: POSTs /campaigns/{id}/actions/replicate and returns the new campaign", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c2" } }]);
  const result = await action.execute!({ campaignId: "c1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/campaigns/c1/actions/replicate");
  assertEquals(result, { id: "c2" });
});
