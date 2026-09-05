import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

Deno.test("lead-get: GETs /Leads/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ body: { LEAD_ID: 1, LAST_NAME: "Doe" } }]);
  const out = await action.execute({ leadId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Leads/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { LEAD_ID: 1, LAST_NAME: "Doe" });
});
