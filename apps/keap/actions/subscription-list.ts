import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/subscriptions` — List Subscriptions.
 *
 * Recurring billing, not marketing subscriptions: a row here is a contact's
 * subscription to a product's billing plan. "Subscribed to a newsletter" is an
 * email opt-in status instead — see Get Email Address Status.
 *
 * Custom fields are filterable here by `field_name`, case-insensitively, the
 * same as on contacts.
 */
interface Input {
  contactId?: string;
  subscriptionPlanId?: string;
  status?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  title: "List Subscriptions",
  resource: "subscription",
  description: "Search recurring billing subscriptions by contact, plan or status.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string" },
    { key: "subscriptionPlanId", label: "Subscription plan ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint: "Keap publishes no enum for this clause in the OpenAPI document, so it is left as " +
        "free text rather than guessed at. Read a subscription first to see the values your " +
        "account uses.",
    },
    filterParam,
    orderByParam(
      "One of `id`, `contact_id`, `subscription_plan_id`, `modification_time`, plus `asc` or " +
        "`desc`.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "subscriptions", type: "array", label: "Subscriptions" },
    { key: "count", type: "number", label: "Subscriptions returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("contact_id", input.contactId),
      eq("subscription_plan_id", input.subscriptionPlanId),
      eq("status", input.status),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ subscriptions?: unknown[]; next_page_token?: string }>(
      `${V2}/subscriptions`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const subscriptions = body?.subscriptions ?? [];
    return { subscriptions, count: subscriptions.length, nextPageToken: nextPageToken(body) };
  },
};

export default subscriptionList;
