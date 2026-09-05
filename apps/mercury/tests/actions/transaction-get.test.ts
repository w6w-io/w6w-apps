import { assertEquals } from "@std/assert";
import transactionGet from "../../actions/transaction-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-get: GETs /transaction/{transactionId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tx_1", amount: -50 } }]);
  const out = await transactionGet.execute({ transactionId: "tx_1" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v1/transaction/tx_1");
  assertEquals((out.transaction as { id: string }).id, "tx_1");
});
