import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";

/**
 * `GET /v2/account/webhooks` — all account webhooks.
 *
 * Paid-plan feature: the vendor's docs mark every `account-webhooks/*`
 * endpoint "Paid plan required — this endpoint is only available on paid
 * plans." A 403 here most likely means the account is on a free plan, not
 * that the credential is broken.
 */
type Input = Record<string, never>;

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all account webhooks. Paid plans only.",
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(_input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>("/account/webhooks");
  },
};

export default webhookList;
