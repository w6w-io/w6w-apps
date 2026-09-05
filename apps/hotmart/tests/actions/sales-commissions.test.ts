import { assertEquals, assertRejects } from "@std/assert";
import salesCommissions from "../../actions/sales-commissions.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("sales-commissions - maps every filter to its wire name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ transaction: "HP1" }]) }]);
  await salesCommissions.execute({
    productId: 1,
    startDate: 1,
    endDate: 2,
    transaction: "HP1",
    commissionAs: "COPRODUCER",
    transactionStatus: "APPROVED",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/payments/api/v1/sales/commissions");
  assertEquals(queryOf(calls[0].url), {
    product_id: "1",
    start_date: "1",
    end_date: "2",
    transaction: "HP1",
    commission_as: "COPRODUCER",
    transaction_status: "APPROVED",
  });
});

Deno.test("sales-commissions - propagates the error body on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("token_expired", "expired") }]);
  await assertRejects(
    () => Promise.resolve(salesCommissions.execute({}, ctx)),
    Error,
    "token_expired",
  );
});
