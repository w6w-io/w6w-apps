import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient, type WebinarGeekPages } from "../lib/client.ts";
import { orderSortParams, paginationParams, scopeFilterParams } from "../lib/params.ts";

/**
 * `GET /subscription_payments` — completed or refunded payments from subscribers to paid
 * webinars, for a broadcast, episode, webinar, or the whole account.
 */
interface Input {
  webinarId?: number;
  episodeId?: number;
  broadcastId?: number;
  nestedResources?: string;
  order?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const subscriptionPaymentList: ActionDefinition<Input> = {
  key: "subscription-payment-list",
  type: "search",
  resource: "subscription-payment",
  title: "List Subscription Payments",
  description:
    "List payments (paid or refunded) from subscribers to paid webinars, filterable by " +
    "webinar, episode or broadcast.",
  params: [
    ...scopeFilterParams(),
    {
      key: "nestedResources",
      label: "Include nested resources",
      type: "select",
      advanced: true,
      options: [
        { value: "broadcast", label: "Broadcast" },
        { value: "episode", label: "Episode" },
        { value: "webinar", label: "Webinar" },
      ],
    },
    ...orderSortParams([{ value: "created_at", label: "Created at" }], "created_at"),
    ...paginationParams(),
  ],
  output: [
    { key: "subscriptionPayments", type: "array", label: "Subscription payments" },
    { key: "totalCount", type: "number", label: "Total matching payments" },
    { key: "page", type: "number", label: "Current page" },
    { key: "perPage", type: "number", label: "Results per page" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const body = await new WebinarGeekClient(ctx).request<
      { total_count?: number; subscription_payments?: unknown[]; pages?: WebinarGeekPages }
    >("/subscription_payments", {
      query: {
        webinar_id: input.webinarId,
        episode_id: input.episodeId,
        broadcast_id: input.broadcastId,
        nested_resources: input.nestedResources,
        order: input.order,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
    return {
      subscriptionPayments: body?.subscription_payments ?? [],
      totalCount: body?.total_count ?? 0,
      page: body?.pages?.page,
      perPage: body?.pages?.per_page,
      totalPages: body?.pages?.total_pages,
    };
  },
};

export default subscriptionPaymentList;
