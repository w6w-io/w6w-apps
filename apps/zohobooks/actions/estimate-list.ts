import type { ActionDefinition } from "@w6w/types";
import { booksList, type BooksListInput, type BooksListResult } from "../lib/books.ts";
import { organizationId, pageParams } from "../lib/params.ts";

interface Input extends BooksListInput {
  customerId?: string;
}

const estimateList: ActionDefinition<Input, BooksListResult<Record<string, unknown>>> = {
  key: "estimate-list",
  type: "read",
  resource: "estimate",
  title: "List Estimates",
  description: "List estimates, with an optional customer filter.",
  params: [
    organizationId,
    { key: "customerId", label: "Customer ID", type: "string", hint: "Filter to one customer." },
    ...pageParams,
  ],
  output: [
    { key: "data", type: "array", label: "Estimates" },
    { key: "pageContext", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return booksList(ctx, "/estimates", "estimates", input, { customer_id: input.customerId });
  },
};

export default estimateList;
