import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {
  filterUrl?: string;
}

/**
 * `GET /v2/users/me/webhooks` — list all account-wide webhooks.
 *
 * Each entry includes its `signing_secret` verbatim — see `webhook-create.ts` for why
 * that is CloudConvert's intended way to retrieve it, not a leak this action should mask.
 */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all account-wide webhooks. Each entry includes its signing secret — " +
    "treat the result as sensitive.",
  params: [
    { key: "filterUrl", label: "URL", type: "string", hint: "Only webhooks with this exact URL." },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "meta", type: "object", label: "Pagination metadata (current_page, per_page, ...)" },
  ],

  execute(input, ctx) {
    return new CloudConvertClient(ctx).page(`/users/me/webhooks`, {
      query: { "filter[url]": input.filterUrl, ...paginationQuery(input) },
    });
  },
};

export default webhookList;
