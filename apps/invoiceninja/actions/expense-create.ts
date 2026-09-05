import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { expenseOutput } from "../lib/params.ts";

interface Input {
  amount: number;
  clientId?: string;
  vendorId?: string;
  categoryId?: string;
  date?: string;
  publicNotes?: string;
  privateNotes?: string;
}

/**
 * `POST /api/v1/expenses` — the OpenAPI document declares NO request body
 * schema for `storeExpense` (only its `200` response, `Expense`), so this
 * action's fields are drawn from that response schema's own writable-looking
 * properties (`amount`, `client_id`, `vendor_id`, `category_id`, `date`,
 * `public_notes`, `private_notes`) rather than an undocumented body — the same
 * fields Invoice Ninja's `ClientRequest`/`InvoiceRequest` pattern would use if
 * a request schema had been published for this operation. Fields the response
 * schema marks as clearly system-owned (`id`, `updated_at`, `is_deleted`) are
 * left out.
 */
const expenseCreate: ActionDefinition<Input> = {
  key: "expense-create",
  type: "perform",
  resource: "expense",
  title: "Create Expense",
  description: "Record an expense.",
  idempotent: false,
  params: [
    { key: "amount", label: "Amount", type: "number", required: true },
    { key: "date", label: "Date", type: "date" },
    { key: "clientId", label: "Client ID", type: "string", row: "refs" },
    { key: "vendorId", label: "Vendor ID", type: "string", row: "refs" },
    { key: "categoryId", label: "Category ID", type: "string", advanced: true },
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: expenseOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/expenses", {
      method: "POST",
      body: {
        amount: input.amount,
        date: unset(input.date),
        client_id: unset(input.clientId),
        vendor_id: unset(input.vendorId),
        category_id: unset(input.categoryId),
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default expenseCreate;
