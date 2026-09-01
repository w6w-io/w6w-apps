import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/expense-get.ts";

Deno.test("expense-get: GETs /expenses/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { expense: { url: "x" } } }]);
  await action.execute({ expenseId: "9" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/expenses/9");
});
