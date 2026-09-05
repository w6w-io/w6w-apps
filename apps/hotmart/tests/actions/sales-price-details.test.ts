import { assertEquals, assertRejects } from "@std/assert";
import salesPriceDetails from "../../actions/sales-price-details.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-price-details - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ transaction: "HP1" }]) }]);
  await salesPriceDetails.execute({
    productId: 1,
    startDate: 1,
    endDate: 2,
    transaction: "HP1",
    transactionStatus: "CANCELLED",
    paymentType: "CREDIT_CARD",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/price/details");
  assertEquals(queryOf(calls[0].url), {
    product_id: "1",
    start_date: "1",
    end_date: "2",
    transaction: "HP1",
    transaction_status: "CANCELLED",
    payment_type: "CREDIT_CARD",
  });
});

Deno.test("sales-price-details - propagates the error body on failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("internal_server_error", "oops") }]);
  await assertRejects(
    () => Promise.resolve(salesPriceDetails.execute({}, ctx)),
    Error,
    "internal_server_error",
  );
});
