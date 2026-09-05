import { assertEquals, assertRejects } from "@std/assert";
import subscriptionSummary from "../../actions/subscription-summary.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-summary - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ subscriber_code: "A" }]) }]);
  await subscriptionSummary.execute({
    productId: 1,
    subscriberCode: 42,
    accessionDate: 10,
    endAccessionDate: 20,
    dateNextCharge: 30,
    maxResults: 500,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/subscriptions/summary");
  assertEquals(queryOf(calls[0].url), {
    product_id: "1",
    subscriber_code: "42",
    accession_date: "10",
    end_accession_date: "20",
    date_next_charge: "30",
    max_results: "500",
  });
});

Deno.test("subscription-summary - surfaces product_not_found", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("product_not_found", "Product not found"),
  }]);
  await assertRejects(
    () => Promise.resolve(subscriptionSummary.execute({}, ctx)),
    Error,
    "product_not_found",
  );
});
