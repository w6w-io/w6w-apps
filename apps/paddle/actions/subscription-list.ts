import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";
import {
  collectionModeOptions,
  idsParam,
  orderByParam,
  paginationParams,
  subscriptionStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /subscriptions` — list subscriptions.
 *
 * Unlike products, prices and customers, this endpoint has **no default status
 * filter**: canceled subscriptions come back alongside active ones unless you
 * filter. That asymmetry is worth knowing before wiring a "current subscribers"
 * report.
 *
 * `scheduled_change_action` is the filter that answers "what is about to
 * change?" — a subscription pending cancellation still reads `active`, so
 * status alone cannot find it.
 */
interface Input {
  ids?: string;
  customerId?: string;
  priceId?: string;
  status?: string[] | string;
  collectionMode?: string;
  scheduledChangeAction?: string[] | string;
  orderBy?: string;
  perPage?: number;
  after?: string;
}

const subscriptionList: ActionDefinition<Input> = {
  key: "subscription-list",
  type: "search",
  resource: "subscription",
  title: "List Subscriptions",
  description:
    "List subscriptions. Note that canceled subscriptions are included unless you filter by " +
    "status.",
  params: [
    idsParam,
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Return only this customer's subscriptions. Comma-separated for several.",
    },
    { key: "priceId", label: "Price ID", type: "string", hint: "Comma-separated for several." },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: subscriptionStatusOptions,
      hint: "Leave empty and Paddle returns every status, canceled included.",
    },
    {
      key: "collectionMode",
      label: "Collection mode",
      type: "select",
      options: collectionModeOptions,
    },
    {
      key: "scheduledChangeAction",
      label: "Scheduled change",
      type: "multiselect",
      options: [
        { value: "cancel", label: "Scheduled to cancel" },
        { value: "pause", label: "Scheduled to pause" },
        { value: "resume", label: "Scheduled to resume (paused subscriptions only)" },
        { value: "none", label: "No scheduled change" },
      ],
      hint:
        "A subscription pending cancellation still has the status `active` — this is how to find " +
        "it.",
    },
    orderByParam("`id`"),
    ...paginationParams("Default 50, maximum 200."),
  ],
  output: [
    { key: "data", type: "array", label: "Subscriptions" },
    { key: "meta", type: "object", label: "Request id and pagination cursor" },
  ],

  execute(input, ctx) {
    return new PaddleClient(ctx).envelope("/subscriptions", {
      query: {
        id: toList(input.ids),
        customer_id: toList(input.customerId),
        price_id: toList(input.priceId),
        status: toList(input.status),
        collection_mode: input.collectionMode,
        scheduled_change_action: toList(input.scheduledChangeAction),
        order_by: input.orderBy,
        per_page: input.perPage,
        after: input.after,
      },
    });
  },
};

export default subscriptionList;
