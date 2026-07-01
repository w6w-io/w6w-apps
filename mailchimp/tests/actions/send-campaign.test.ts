import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-campaign.ts";

Deno.test("send-campaign: POSTs /campaigns/{id}/actions/send", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ campaignId: "c1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/campaigns/c1/actions/send");
  assertEquals(result, { success: true });
});

Deno.test("send-campaign: is marked not-idempotent (guards against double sends)", () => {
  assertEquals(action.idempotent, false);
});
