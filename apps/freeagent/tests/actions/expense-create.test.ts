import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/expense-create.ts";

Deno.test("expense-create: POSTs /expenses with the claimant as a full resource URL", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 201, body: { expense: { url: "x" } } }]);
  await action.execute({
    userId: "1",
    category: "Travel",
    datedOn: "2026-08-01",
    grossValue: "-42.50",
    description: "Train ticket",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.expense.user, "https://api.freeagent.com/v2/users/1");
  assertEquals(body.expense.category, "Travel");
  assertEquals(body.expense.dated_on, "2026-08-01");
  assertEquals(body.expense.gross_value, "-42.50");
  assertEquals(body.expense.description, "Train ticket");
});
