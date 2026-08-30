import type { ActionDefinition } from "@w6w/types";
import { resolveAccountId, toList, WhopClient, type WhopPage } from "../lib/client.ts";
import {
  accountIdParam,
  createdWindowParams,
  createdWindowQuery,
  cursorParams,
  cursorQuery,
} from "../lib/params.ts";

/**
 * `GET /products` — an account's products, or the public marketplace.
 *
 * Omitting `accountId` (and its connection default) searches the public
 * marketplace instead of one account's own catalog — Whop's own words: "Omit
 * `account_id` to search the public marketplace." That is a real mode
 * switch, not a narrowing, so this action makes it explicit with a hint
 * rather than silently falling back to the connection's account like the
 * other list actions.
 */
interface Input {
  accountId?: string;
  useMarketplace?: boolean;
  query?: string;
  planTypes?: string[] | string;
  createdAfter?: string;
  createdBefore?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List an account's products, or search the public marketplace.",
  params: [
    {
      key: "useMarketplace",
      label: "Search public marketplace instead",
      type: "boolean",
      hint: "When on, ignores Account ID entirely and searches the public marketplace.",
    },
    accountIdParam,
    {
      key: "query",
      label: "Search",
      type: "string",
      hint: "Ranked search against product title and headline. Omit to browse by recency.",
    },
    {
      key: "planTypes",
      label: "Plan types",
      type: "multiselect",
      options: [
        { value: "renewal", label: "Recurring (renewal)" },
        { value: "one_time", label: "One-time" },
      ],
      hint: "Only products with a buyable plan of these billing models.",
    },
    ...createdWindowParams,
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Products" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  execute(input, ctx) {
    const accountId = input.useMarketplace ? undefined : resolveAccountId(input.accountId, ctx);
    return new WhopClient(ctx).get<WhopPage<unknown>>("/products", {
      account_id: accountId,
      query: input.query,
      plan_types: toList(input.planTypes),
      ...createdWindowQuery(input),
      ...cursorQuery(input),
    });
  },
};

export default productList;
