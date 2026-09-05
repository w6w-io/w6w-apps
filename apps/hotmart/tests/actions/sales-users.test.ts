import { assertEquals, assertRejects } from "@std/assert";
import salesUsers from "../../actions/sales-users.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-users - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ transaction: "HP1" }]) }]);
  await salesUsers.execute({
    productId: 1,
    startDate: 1,
    endDate: 2,
    buyerEmail: "a@b.com",
    buyerName: "Ann",
    salesSource: "HOTMART",
    transaction: "HP1",
    affiliateName: "Bob",
    commissionAs: "AFFILIATE",
    transactionStatus: "COMPLETE",
    pageToken: "tok",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/users");
  assertEquals(queryOf(calls[0].url), {
    product_id: "1",
    start_date: "1",
    end_date: "2",
    buyer_email: "a@b.com",
    buyer_name: "Ann",
    sales_source: "HOTMART",
    transaction: "HP1",
    affiliate_name: "Bob",
    commission_as: "AFFILIATE",
    transaction_status: "COMPLETE",
    page_token: "tok",
  });
});

Deno.test("sales-users - surfaces a 403 unauthorized_client", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("unauthorized_client", "no permission"),
  }]);
  await assertRejects(
    () => Promise.resolve(salesUsers.execute({}, ctx)),
    Error,
    "unauthorized_client",
  );
});
