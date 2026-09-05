import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  asOptionalJson,
  listIdParam,
  paginationParams,
  paginationQuery,
  sortOrderOptions,
  subscriberStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /accounts/{accountId}/lists/{listId}/subscribers?ws.op=find` — search
 * subscribers on one list by any combination of filters. AWeber documents
 * over twenty filterable fields; the most commonly used are exposed directly
 * and the rest are reachable via "Extra filters" using the vendor's own
 * query names verbatim (e.g. `area_code`, `dma_code`, `postal_code`,
 * `latitude`, `subscription_method`). One filter worth calling out: "not
 * tagged" is the query key `tags_not_in`, not `not_tags` or `exclude_tags`.
 */
interface Input {
  accountId: string;
  listId: string;
  email?: string;
  name?: string;
  status?: string;
  tags?: string[] | string;
  tagsNotIn?: string[] | string;
  subscribedAfter?: string;
  subscribedBefore?: string;
  sortKey?: string;
  sortOrder?: string;
  extraFilters?: unknown;
  start?: number;
  size?: number;
}

const subscriberFind: ActionDefinition<Input> = {
  key: "subscriber-find",
  type: "search",
  resource: "subscriber",
  title: "Find Subscribers",
  description: "Search subscribers on one list by email, status, tags, or subscribe date.",
  params: [
    accountIdParam,
    listIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "select", options: subscriberStatusOptions },
    { key: "tags", label: "Has all tags", type: "multiselect" },
    { key: "tagsNotIn", label: "Has none of these tags", type: "multiselect" },
    { key: "subscribedAfter", label: "Subscribed after", type: "datetime" },
    { key: "subscribedBefore", label: "Subscribed before", type: "datetime" },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "subscribed_at", label: "Subscribed at" },
        { value: "unsubscribed_at", label: "Unsubscribed at" },
      ],
    },
    { key: "sortOrder", label: "Sort order", type: "select", options: sortOrderOptions },
    {
      key: "extraFilters",
      label: "Extra filters",
      type: "json",
      hint: "Object of any other AWeber filter field to value, using AWeber's own query names, " +
        'e.g. {"area_code": 555, "postal_code": "19001"}.',
    },
    ...paginationParams(),
  ],
  output: [{ key: "entries", type: "array", label: "Matching subscribers" }],

  execute(input, ctx) {
    const tags = Array.isArray(input.tags) ? input.tags : input.tags ? [input.tags] : undefined;
    const tagsNotIn = Array.isArray(input.tagsNotIn)
      ? input.tagsNotIn
      : input.tagsNotIn
      ? [input.tagsNotIn]
      : undefined;
    const extra = asOptionalJson<Record<string, string | number | boolean>>(
      input.extraFilters,
      "Extra filters",
    ) ?? {};

    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/subscribers`,
      {
        "ws.op": "find",
        email: input.email,
        name: input.name,
        status: input.status,
        tags: tags?.length ? JSON.stringify(tags) : undefined,
        tags_not_in: tagsNotIn?.length ? JSON.stringify(tagsNotIn) : undefined,
        subscribed_after: input.subscribedAfter,
        subscribed_before: input.subscribedBefore,
        sort_key: input.sortKey,
        sort_order: input.sortOrder,
        ...extra,
        ...paginationQuery(input),
      },
    );
  },
};

export default subscriberFind;
