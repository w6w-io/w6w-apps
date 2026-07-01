import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-campaign.ts";

Deno.test("send-campaign: POSTs a campaign-send-job carrying the campaign id", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { id: "c-1" } } }]);
  await action.execute!({ campaignId: "c-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/campaign-send-jobs/");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.data.type, "campaign-send-job");
  assertEquals(sent.data.id, "c-1");
});
