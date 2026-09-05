import { assertEquals } from "@std/assert";
import transactionCreate from "../../actions/transaction-create.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-create: POSTs the required fields plus whatever else was set", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "tx_1" }) }]);
  await transactionCreate.execute(
    { method: "cash", transacted_at: "2026-01-01T00:00:00Z", amount: "25.00", fund_code: "GEN" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(JSON.parse(calls[0].body!), {
    method: "cash",
    transacted_at: "2026-01-01T00:00:00Z",
    amount: "25.00",
    fund_code: "GEN",
  });
});
