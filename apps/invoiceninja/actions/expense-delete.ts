import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  expenseId: string;
}

/** `DELETE /api/v1/expenses/{id}` — verified against `deleteExpense`. Soft delete. */
const expenseDelete: ActionDefinition<Input> = {
  key: "expense-delete",
  type: "perform",
  resource: "expense",
  title: "Delete Expense",
  description: "Soft-delete an expense.",
  idempotent: true,
  params: [
    { key: "expenseId", label: "Expense ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/expenses/${input.expenseId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default expenseDelete;
