import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { pageQuery, paginationParams } from "../lib/params.ts";

/** `GET /v1/webhooks` — filter parameter documented: `store_id`. */
interface Input {
  storeId?: string;
  pageNumber?: number;
  pageSize?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhooks, optionally filtered by store.",
  params: [
    { key: "storeId", label: "Store ID", type: "string" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "meta", type: "object", label: "Pagination info" },
    { key: "links", type: "object", label: "first/last/next/prev page URLs" },
  ],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/webhooks", {
      query: { "filter[store_id]": input.storeId, ...pageQuery(input) },
    });
  },
};

export default webhookList;
