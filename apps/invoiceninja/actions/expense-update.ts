import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { expenseOutput } from "../lib/params.ts";

interface Input {
  expenseId: string;
  amount?: number;
  date?: string;
  publicNotes?: string;
  privateNotes?: string;
}

/**
 * `PUT /api/v1/expenses/{id}` — same documentation gap as `expense-create`
 * (no request body schema published for `updateExpense`); fields are drawn
 * from the `Expense` response schema's writable-looking properties.
 */
const expenseUpdate: ActionDefinition<Input> = {
  key: "expense-update",
  type: "perform",
  resource: "expense",
  title: "Update Expense",
  description: "Update an expense. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "expenseId", label: "Expense ID", type: "string", required: true },
    { key: "amount", label: "Amount", type: "number" },
    { key: "date", label: "Date", type: "date" },
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: expenseOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/expenses/${input.expenseId}`, {
      method: "PUT",
      body: {
        amount: input.amount,
        date: unset(input.date),
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default expenseUpdate;
