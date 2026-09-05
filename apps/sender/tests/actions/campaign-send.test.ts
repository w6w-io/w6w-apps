import { assertEquals } from "@std/assert";
import campaignSend from "../../actions/campaign-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-send: POSTs to /v2/campaigns/{id}/send", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "Campaign started to send" },
  }]);
  await campaignSend.execute({ id: "c1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/send");
});
