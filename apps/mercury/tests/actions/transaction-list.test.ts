import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: GETs /transactions", async () => {
  const { ctx, calls } = mockCtx([{ body: { transactions: [{ id: "tx_1" }], page: {} } }]);
  const out = await transactionList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/transactions");
  assertEquals((out.items as unknown[]).length, 1);
});

Deno.test("transaction-list: repeats status and accountId as multi-value query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { transactions: [], page: {} } }]);
  await transactionList.execute(
    { status: ["pending", "sent"], accountId: ["acc_1", "acc_2"] },
    ctx,
  );
  assertEquals(queryAllOf(calls[0].url, "status"), ["pending", "sent"]);
  assertEquals(queryAllOf(calls[0].url, "accountId"), ["acc_1", "acc_2"]);
});

Deno.test("transaction-list: forwards date and category filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { transactions: [], page: {} } }]);
  await transactionList.execute({ start: "2026-01-01", categoryId: "cat_1" }, ctx);
  assertEquals(queryOf(calls[0].url).start, "2026-01-01");
  assertEquals(queryOf(calls[0].url).categoryId, "cat_1");
});
