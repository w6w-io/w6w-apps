import { assertEquals, assertRejects } from "@std/assert";
import salesSummary from "../../actions/sales-summary.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-summary - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ total_items: 2 }]) }]);
  await salesSummary.execute({
    productId: 1,
    startDate: 1,
    endDate: 2,
    salesSource: "HOTMART",
    affiliateName: "Bob",
    paymentType: "PIX",
    offerCode: "code",
    transaction: "HP1",
    transactionStatus: "APPROVED",
    maxResults: 5,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/summary");
  assertEquals(queryOf(calls[0].url), {
    product_id: "1",
    start_date: "1",
    end_date: "2",
    sales_source: "HOTMART",
    affiliate_name: "Bob",
    payment_type: "PIX",
    offer_code: "code",
    transaction: "HP1",
    transaction_status: "APPROVED",
    max_results: "5",
  });
});

Deno.test("sales-summary - propagates a 500 as an internal_server_error", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("internal_server_error", "oops") }]);
  await assertRejects(
    () => Promise.resolve(salesSummary.execute({}, ctx)),
    Error,
    "internal_server_error",
  );
});
