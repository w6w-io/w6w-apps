import { assertEquals } from "@std/assert";
import { mockInsightlyCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-create.ts";

Deno.test("opportunity-create: POSTs /Opportunities with the fields", async () => {
  const { ctx, calls } = mockInsightlyCtx([{ status: 201, body: { OPPORTUNITY_ID: 1 } }]);
  await action.execute({ opportunityName: "Big Deal", bidAmount: 5000, bidCurrency: "USD" }, ctx);
  assertEquals(calls[0].url, "https://api.na1.insightly.com/v3.1/Opportunities");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    OPPORTUNITY_NAME: "Big Deal",
    BID_AMOUNT: 5000,
    BID_CURRENCY: "USD",
  });
});
