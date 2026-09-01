import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/expense-get.ts";

Deno.test("expense-get: GETs /expenses/expenses/{expenseId}", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { expense: {} } } } }]);
  await action.execute({ expenseId: "1569533" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/expenses/expenses/1569533",
  );
});
