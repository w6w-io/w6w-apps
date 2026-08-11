import type { ActionDefinition } from "@w6w/types";
import { AircallClient, stripWebhookTokens } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  orderOptions,
  type PaginationInput,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  order?: string;
}

/**
 * `GET /v1/webhooks` — the company's registered Webhooks.
 *
 * **Every row Aircall returns carries a `token`, and this action deletes it.**
 * That field is not an identifier: the reference calls it the "Unique token for
 * request's authentication" and tells integrators to "use the `token` field to
 * identify from which Aircall account a Webhook is sent from" — it is the shared
 * secret a receiver checks to decide whether an inbound delivery is genuine.
 * Listing a company's webhooks would otherwise copy up to 100 live secrets into
 * a workflow run record, where they are stored, logged and previewed. See
 * `stripWebhookTokens` in `lib/client.ts`.
 *
 * The secret is still obtainable where it is legitimately needed: Create Webhook
 * returns it once, for the webhook that call just created. It cannot be re-read;
 * if it is lost, delete the webhook and register a new one.
 *
 * Which webhooks are visible depends on how the connection authenticates. With
 * an API key, "webhooks created through the Aircall's dashboard and Basic Auth
 * API requests are accessible" — so this is the whole company's set, not just
 * this integration's.
 */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List registered Webhooks. Each webhook's shared authentication token is stripped — Create " +
    "Webhook is the only place it is returned.",
  params: [
    { key: "order", label: "Order", type: "select", options: orderOptions },
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/webhooks", "webhooks", {
      query: { ...paginationQuery(input), order: input.order },
    });
    return listResult(meta, stripWebhookTokens(items));
  },
};

export default webhookList;
