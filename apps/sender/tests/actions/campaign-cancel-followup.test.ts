import { assertEquals } from "@std/assert";
import campaignCancelFollowup from "../../actions/campaign-cancel-followup.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-cancel-followup: POSTs to /v2/campaigns/{id}/cancel_followup", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Campaign auto followup canceled" },
  }]);
  await campaignCancelFollowup.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/cancel_followup");
});
