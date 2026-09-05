import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-details-get.ts";

Deno.test("campaign-details-get: sends campaign_id as a query param", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { name: "Welcome" } }], {
    display: { instance: "iad-01" },
  });
  const result = await action.execute!({ campaignId: "camp1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/campaigns/details");
  assertEquals(q.get("campaign_id"), "camp1");
  assertEquals(result, { name: "Welcome" });
});
