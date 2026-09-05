import { assertEquals, assertRejects } from "@std/assert";
import salesHistory from "../../actions/sales-history.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-history - builds the request with every filter mapped to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ product: { id: 1 } }]) }]);
  const out = await salesHistory.execute({
    productId: 123,
    startDate: 1,
    endDate: 2,
    transaction: "HP1",
    buyerName: "Ian",
    buyerEmail: "ian@x.com",
    transactionStatus: "APPROVED",
    paymentType: "PIX",
    offerCode: "abc",
    commissionAs: "PRODUCER",
    salesSource: "HOTMART",
    maxResults: 10,
    pageToken: "tok",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/history");
  assertEquals(queryOf(calls[0].url), {
    product_id: "123",
    start_date: "1",
    end_date: "2",
    transaction: "HP1",
    buyer_name: "Ian",
    buyer_email: "ian@x.com",
    transaction_status: "APPROVED",
    payment_type: "PIX",
    offer_code: "abc",
    commission_as: "PRODUCER",
    sales_source: "HOTMART",
    max_results: "10",
    page_token: "tok",
  });
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("sales-history - works with no filters at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await salesHistory.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("sales-history - surfaces Hotmart's error body on a 401", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_token", "The Token has expired."),
  }]);
  await assertRejects(() => Promise.resolve(salesHistory.execute({}, ctx)), Error, "invalid_token");
});
