import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-get.ts";

Deno.test("opportunity-get: GETs /Opportunities/{id}", async () => {
  const { ctx, calls } = mockInsightlyCtx([{
    body: { OPPORTUNITY_ID: 1, OPPORTUNITY_NAME: "Big Deal" },
  }]);
  const out = await action.execute({ opportunityId: 1 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Opportunities/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { OPPORTUNITY_ID: 1, OPPORTUNITY_NAME: "Big Deal" });
});
