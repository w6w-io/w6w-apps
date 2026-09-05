import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/lead-update.ts";

Deno.test("lead-update: PUTs /Leads with the id and only set fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { LEAD_ID: 1 } }]);
  await action.execute({ leadId: 1, leadStatusId: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Leads");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { LEAD_ID: 1, LEAD_STATUS_ID: 2 });
});
