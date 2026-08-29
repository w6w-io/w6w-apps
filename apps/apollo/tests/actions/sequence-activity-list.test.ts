import { assertEquals } from "@std/assert";
import sequenceActivityList from "../../actions/sequence-activity-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("sequence-activity-list: POSTs a JSON body to /emailer_campaigns/activity_feed", async () => {
  const { ctx, calls } = mockCtx([{
    body: { contact_id: "c1", events: [{ type: "email_sent" }] },
  }]);
  const out = await sequenceActivityList.execute({ contact_id: "c1", per_page: 10 }, ctx) as {
    events: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/emailer_campaigns/activity_feed");
  assertEquals(JSON.parse(calls[0].body!), { contact_id: "c1", per_page: 10 });
  assertEquals(out.events.length, 1);
});
