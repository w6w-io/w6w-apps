import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { mockCtx, pageEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: forwards filters to /transactions", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await transactionList.execute({ method: "card", scope: "all" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(queryOf(calls[0].url), { method: "card", scope: "all" });
});
