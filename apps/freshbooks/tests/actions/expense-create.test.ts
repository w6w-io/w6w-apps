import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/expense-create.ts";

Deno.test("expense-create: POSTs /expenses/expenses with the amount/category/date envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{
    body: { response: { result: { expense: { id: 1 } } } },
  }]);
  await action.execute({ amount: 39.99, categoryId: "93993004", date: "2026-08-01" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/expenses/expenses",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    expense: {
      amount: { amount: "39.99", code: "USD" },
      categoryid: "93993004",
      date: "2026-08-01",
    },
  });
});

Deno.test("expense-create: honors currencyCode and merges optional fields", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({
    amount: 10,
    currencyCode: "CAD",
    categoryId: "1",
    date: "2026-08-01",
    vendor: "Ice Cream",
    additionalFields: { notes: "Rocky Road" },
  }, ctx);
  const body = JSON.parse(calls[0].body!).expense;
  assertEquals(body.amount, { amount: "10", code: "CAD" });
  assertEquals(body.vendor, "Ice Cream");
  assertEquals(body.notes, "Rocky Road");
});
