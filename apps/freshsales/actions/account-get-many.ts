import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";
import { pagination, viewIdParam } from "../lib/params.ts";

interface Input {
  viewId: number;
  page?: number;
  perPage?: number;
}

/**
 * Freshsales has no flat "list all accounts" endpoint — listing always goes
 * through a saved view (`/api/sales_accounts/view/[view_id]`). See "List
 * Views" to find a view id.
 */
const accountGetMany: ActionDefinition<Input> = {
  key: "account-get-many",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description:
    'List accounts (Freshsales\'s "Sales Accounts") from a saved view. Freshsales has no flat ' +
    '"list all" endpoint — every listing goes through a view; use "List Views" to find one.',
  params: [viewIdParam("accounts"), ...pagination],
  output: [
    { key: "accounts", type: "array", label: "Accounts" },
    { key: "total", type: "number", label: "Total (this view)" },
  ],

  async execute(input, ctx) {
    const { items, total } = await new FreshsalesClient(ctx).list(
      "sales_accounts",
      `/sales_accounts/view/${input.viewId}`,
      { query: { page: input.page, per_page: input.perPage } },
    );
    return { accounts: items, total };
  },
};

export default accountGetMany;
