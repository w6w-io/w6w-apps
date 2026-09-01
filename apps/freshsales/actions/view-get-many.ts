import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";

interface Input {
  resource: "contacts" | "sales_accounts" | "deals";
}

interface FreshsalesView {
  id: number;
  name: string;
  model_class_name: string;
  is_default: boolean;
  is_public: boolean;
  updated_at: string;
}

/** The `/[resource]/filters` path each of the three core resources exposes. */
const FILTERS_PATH: Record<Input["resource"], string> = {
  contacts: "/contacts/filters",
  sales_accounts: "/sales_accounts/filters",
  deals: "/deals/filters",
};

/**
 * Freshsales's saved views (its "filters") are the only way to list records —
 * there is no flat "list all" endpoint for any resource. This action is what
 * every `*-get-many` action's "View ID" param points a user at: fetch the
 * account's own views (including the built-ins — "All Contacts", "My Deals",
 * etc.), pick one, and pass its `id` on. View ids are per-account, never a
 * fixed constant.
 */
const viewGetMany: ActionDefinition<Input> = {
  key: "view-get-many",
  type: "search",
  resource: "view",
  title: "List Views",
  description: "List the saved views (filters) available for a resource, and their ids.",
  params: [
    {
      key: "resource",
      label: "Resource",
      type: "select",
      required: true,
      default: "contacts",
      options: [
        { value: "contacts", label: "Contacts" },
        { value: "sales_accounts", label: "Accounts" },
        { value: "deals", label: "Deals" },
      ],
    },
  ],
  output: [{ key: "views", type: "array", label: "Views" }],

  async execute(input, ctx) {
    const body = await new FreshsalesClient(ctx).request<{ filters: FreshsalesView[] }>(
      FILTERS_PATH[input.resource],
    );
    return { views: body.filters };
  },
};

export default viewGetMany;
