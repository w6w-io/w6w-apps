import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/expense-delete.ts";

Deno.test("expense-delete: DELETEs /expenses/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ expenseId: "e1" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/expenses/e1");
  assertEquals(out, {});
});
