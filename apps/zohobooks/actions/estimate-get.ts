import type { ActionDefinition } from "@w6w/types";
import { booksGet, type BooksGetInput } from "../lib/books.ts";
import { organizationId, recordId } from "../lib/params.ts";

const estimateGet: ActionDefinition<BooksGetInput> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Retrieve one estimate by id.",
  params: [{ ...recordId, hint: "The Zoho Books estimate id." }, organizationId],
  output: [{ key: "estimate_id", type: "string", label: "Estimate ID" }],

  execute(input, ctx) {
    return booksGet(ctx, "/estimates", "estimate", input);
  },
};

export default estimateGet;
