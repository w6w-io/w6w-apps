import type { ActionDefinition } from "@w6w/types";
import { stripPaymentSecret, toList, WhopClient, type WhopPage } from "../lib/client.ts";
import { cursorParams, cursorQuery } from "../lib/params.ts";

/**
 * `GET /payments` — the Legacy Payments resource.
 *
 * As of 2026-08-29 Payments has NOT been migrated to the versioned
 * `account_id` model every other list action in this app uses — it still
 * takes `company_id`, confirmed by both the vendor's own Legacy reference
 * page and by Whop's getting-started guide, whose one worked `curl` example
 * against this whole API is `GET /payments?company_id=biz_...`. See
 * `lib/client.ts` for the full finding.
 */
interface Input {
  companyId?: string;
  productIds?: string[] | string;
  planIds?: string[] | string;
  statuses?: string[] | string;
  currencies?: string[] | string;
  includeFree?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const paymentList: ActionDefinition<Input> = {
  key: "payment-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "List payments (the Legacy resource — uses company_id, not account_id).",
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      placeholder: "biz_xxxxxxxxxxxxxx",
      hint: "The Legacy Payments resource's own scoping field — note it is company_id, not " +
        "account_id.",
    },
    { key: "productIds", label: "Product IDs", type: "multiselect" },
    { key: "planIds", label: "Plan IDs", type: "multiselect" },
    {
      key: "statuses",
      label: "Statuses",
      type: "multiselect",
      options: [
        { value: "paid", label: "Paid" },
        { value: "pending", label: "Pending" },
        { value: "open", label: "Open" },
        { value: "canceled", label: "Canceled" },
        { value: "refunded", label: "Refunded" },
        { value: "disputed", label: "Disputed" },
      ],
    },
    {
      key: "currencies",
      label: "Currencies",
      type: "multiselect",
      hint: "Three-letter ISO currency codes to filter by (usd, eur, ...).",
    },
    {
      key: "includeFree",
      label: "Include zero-amount payments",
      type: "boolean",
      hint: "Off by default: an account whose sales are all free plans returns an empty list " +
        "unless this is on.",
    },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    ...cursorParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Payments" },
    { key: "page_info", type: "object", label: "Pagination cursors" },
  ],

  async execute(input, ctx) {
    const page = await new WhopClient(ctx).get<WhopPage<unknown>>(
      "/payments",
      {
        company_id: input.companyId,
        product_ids: toList(input.productIds),
        plan_ids: toList(input.planIds),
        statuses: toList(input.statuses),
        currencies: toList(input.currencies),
        include_free: input.includeFree,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
        ...cursorQuery(input),
      },
      // The Legacy Payments OpenAPI fragment declares its array filters
      // `style: form, explode: true` — plain repeated keys, not `key[]=`.
      "repeat",
    );
    return { ...page, data: (page?.data ?? []).map((item) => stripPaymentSecret(item)) };
  },
};

export default paymentList;
