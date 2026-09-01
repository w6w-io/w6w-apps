import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/expense-list.ts";

Deno.test("expense-list: GETs /expenses/expenses, page defaulted to 1", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { expenses: [] } } } }]);
  await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/accounting/account/acc1/expenses/expenses");
  assertEquals(url.searchParams.get("page"), "1");
});
