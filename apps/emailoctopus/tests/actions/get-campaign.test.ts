import { assertEquals } from "@std/assert";
import action from "../../actions/get-campaign.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-campaign: GETs /campaigns/{id}", async () => {
  const body = { id: "cmp1", status: "sent", content: { html: "<p>hi</p>" } };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ campaignId: "cmp1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/campaigns/cmp1");
  assertEquals(out, body);
});

Deno.test("get-campaign: is a read action", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "campaign");
});
