import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/resend-campaign.ts";

Deno.test("resend-campaign: POSTs /campaigns/{id}/actions/create-resend", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c-resend" } }]);
  const result = await action.execute!({ campaignId: "c1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/campaigns/c1/actions/create-resend");
  assertEquals(result, { id: "c-resend" });
});
