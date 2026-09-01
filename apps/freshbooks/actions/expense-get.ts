import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient } from "../lib/client.ts";

interface Input {
  expenseId: string;
}

const expenseGet: ActionDefinition<Input> = {
  key: "expense-get",
  type: "read",
  resource: "expense",
  title: "Get Expense",
  description: "Get a single expense by id.",
  params: [
    { key: "expenseId", label: "Expense ID", type: "string", required: true },
  ],
  output: [{ key: "expense", type: "object", label: "Expense" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/expenses/expenses/${encodeURIComponent(input.expenseId)}`,
    );
  },
};

export default expenseGet;
