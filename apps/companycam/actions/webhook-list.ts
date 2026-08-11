import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, type ListPage, stripWebhookSecrets } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/webhooks` — the company's webhook subscriptions.
 *
 * **Every row carries `token`, and this action deletes it before returning.**
 * That field is the HMAC-SHA1 key CompanyCam signs deliveries with and that
 * receivers compare against the `X-CompanyCam-Signature` header — anyone
 * holding it can forge a delivery that validates. A workflow result is stored
 * in the run record and echoed into logs, so returning it would turn a routine
 * list call into a durable secret leak. See `stripWebhookSecret` in
 * `lib/client.ts`.
 *
 * Nothing else is altered: `id`, `url`, `scopes` and `enabled` come back
 * verbatim.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const webhookList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description:
    "List the company's webhooks. The signing token is removed from every row before it is " +
    "returned.",
  params: [...pageParams()],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx)
      .list<Record<string, unknown>>("/webhooks", { query: paginationQuery(input) })
      .then(stripWebhookSecrets);
  },
};

export default webhookList;
