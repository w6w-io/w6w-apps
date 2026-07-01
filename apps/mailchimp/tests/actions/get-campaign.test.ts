import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-campaign.ts";

Deno.test("get-campaign: GETs /campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  const result = await action.execute!({ campaignId: "c1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/3.0/campaigns/c1");
  assertEquals(result, { id: "c1" });
});
