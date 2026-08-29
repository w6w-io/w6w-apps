import { assertEquals } from "@std/assert";
import campaignSendingStatusGet from "../../actions/campaign-sending-status-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-sending-status-get: GETs /campaigns/{id}/sending-status", async () => {
  const { ctx, calls } = mockCtx([
    { body: { diagnostics: { status: "healthy" }, summary: "Sending normally" } },
  ]);
  const out = await campaignSendingStatusGet.execute({ id: "c1" }, ctx) as { summary: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns/c1/sending-status");
  assertEquals(out.summary, "Sending normally");
});
