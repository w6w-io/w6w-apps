import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient, jsonObject, ref } from "../lib/client.ts";

interface Input {
  userId: string;
  category: string;
  datedOn: string;
  grossValue?: string;
  description: string;
  additionalFields?: unknown;
}

const expenseCreate: ActionDefinition<Input> = {
  key: "expense-create",
  type: "perform",
  resource: "expense",
  title: "Create Expense",
  description: "Record an expense claim for a user.",
  // FreeAgent mints a new expense id per call and offers no request key, so
  // a retry creates a duplicate expense.
  idempotent: false,
  params: [
    { key: "userId", label: "User ID (claimant)", type: "string", required: true },
    {
      key: "category",
      label: "Category",
      type: "string",
      required: true,
      hint: 'An accounting category URL, or "Mileage".',
    },
    { key: "datedOn", label: "Dated on", type: "date", required: true },
    {
      key: "grossValue",
      label: "Gross value",
      type: "string",
      hint:
        "Total value in the expense's currency. Negative = payment to the claimant, positive = refund due from the claimant. Required unless category is Mileage.",
    },
    { key: "description", label: "Description", type: "string", required: true },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint:
        'Merged into the expense object using FreeAgent\'s field names, e.g. { "currency": "GBP", "sales_tax_rate": "20.0" }.',
    },
  ],
  output: [{ key: "expense", type: "object", label: "Expense" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/expenses", {
      method: "POST",
      body: {
        expense: {
          user: ref("users", input.userId),
          category: input.category,
          dated_on: input.datedOn,
          description: input.description,
          ...compact({ gross_value: input.grossValue }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default expenseCreate;
