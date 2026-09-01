import type { ActionDefinition } from "@w6w/types";
import { compact, FreshBooksClient, jsonObject, unset } from "../lib/client.ts";
import { additionalFields } from "../lib/params.ts";

interface Input {
  amount: number;
  currencyCode?: string;
  categoryId: string;
  date: string;
  vendor?: string;
  note?: string;
  clientId?: string;
  additionalFields?: unknown;
}

const expenseCreate: ActionDefinition<Input> = {
  key: "expense-create",
  type: "perform",
  resource: "expense",
  title: "Create Expense",
  description: "Record a new expense.",
  // FreshBooks mints a new expense id per call and offers no request key, so
  // a retry creates a duplicate expense.
  idempotent: false,
  params: [
    { key: "amount", label: "Amount", type: "number", required: true },
    {
      key: "currencyCode",
      label: "Currency code",
      type: "string",
      default: "USD",
      hint: "3-letter currency code, e.g. USD.",
    },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      required: true,
      hint: "An expense category id from FreshBooks' Expense Categories.",
    },
    { key: "date", label: "Date", type: "date", required: true, hint: "YYYY-MM-DD." },
    { key: "vendor", label: "Vendor", type: "string", advanced: true },
    { key: "note", label: "Note", type: "text", advanced: true },
    { key: "clientId", label: "Client ID", type: "string", advanced: true },
    additionalFields,
  ],
  output: [{ key: "expense", type: "object", label: "Expense" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("accounting", "/expenses/expenses", {
      method: "POST",
      body: {
        expense: {
          amount: { amount: String(input.amount), code: input.currencyCode || "USD" },
          categoryid: input.categoryId,
          date: input.date,
          ...compact({
            vendor: unset(input.vendor),
            notes: unset(input.note),
            clientid: unset(input.clientId),
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default expenseCreate;
