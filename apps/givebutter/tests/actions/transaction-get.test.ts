import { assertEquals } from "@std/assert";
import transactionGet from "../../actions/transaction-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-get: fetches /transactions/{id} by its tid", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "tx_abc", amount: 25 }) }]);
  const out = await transactionGet.execute({ id: "tx_abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/transactions/tx_abc");
  assertEquals(out, { id: "tx_abc", amount: 25 });
});
