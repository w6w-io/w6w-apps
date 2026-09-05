import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deals-create.ts";

Deno.test("deals-create: POSTs deals.create nesting customer under lead, returns id/type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { type: "deal", id: "d1" } } }]);
  const out = await action.execute({
    customerType: "company",
    customerId: "co-1",
    title: "Interesting business deal",
    estimatedValueAmount: 123.3,
    estimatedValueCurrency: "EUR",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/deals.create");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.lead, { customer: { type: "company", id: "co-1" } });
  assertEquals(body.title, "Interesting business deal");
  assertEquals(body.estimated_value, { amount: 123.3, currency: "EUR" });
  assertEquals(out, { type: "deal", id: "d1" });
});
