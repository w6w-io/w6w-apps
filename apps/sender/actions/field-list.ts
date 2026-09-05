import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";

/**
 * `GET /v2/fields` — every custom field in the account.
 *
 * The vendor's own worked example response body carries `data` as a single
 * object rather than an array (likely a documentation error, since every
 * other list endpoint's `data` is an array and this one's own `meta.total`
 * says `8`), so this returns the body untouched via `.json()` rather than
 * asserting a shape the example itself doesn't consistently show.
 */
type Input = Record<string, never>;

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "search",
  resource: "field",
  title: "List Fields",
  description: "List all custom subscriber fields in the account.",
  output: [
    { key: "data", type: "array", label: "Fields" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(_input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/fields");
  },
};

export default fieldList;
