import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/expense-update.ts";

Deno.test("expense-update: PUTs /expenses/expenses/{expenseId} with the fields envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { expense: {} } } } }]);
  await action.execute({ expenseId: "1574917", fields: { vendor: "Arnold Vendor" } }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/expenses/expenses/1574917",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { expense: { vendor: "Arnold Vendor" } });
});
