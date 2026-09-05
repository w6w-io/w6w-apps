import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-update.ts";

Deno.test("opportunity-update: PUTs /Opportunities with the id and only set fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { OPPORTUNITY_ID: 1 } }]);
  await action.execute({ opportunityId: 1, probability: 80 }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Opportunities");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { OPPORTUNITY_ID: 1, PROBABILITY: 80 });
});
