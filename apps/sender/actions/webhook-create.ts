import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `POST /v2/account/webhooks` — creates a webhook. Paid plans only.
 *
 * ## `topic` is a free-text field on purpose
 *
 * The vendor's own parameter table names `topic` as "Available topics to
 * create webhook:" and then the list is empty — a gap in Sender's own
 * documentation, not something this app can fill in by guessing. The only
 * topics confirmed by a worked request/response example anywhere in the
 * crawled docs are `groups/new-subscriber` (create-webhook's own example) and
 * `campaigns/new` (update-webhook's example); `groups/unsubscribed` is named
 * only in the `relation_id` field's description, never itself demonstrated.
 * Rather than ship a `select` with a fabricated "complete" list, `topic`
 * stays a plain string and the confirmed values are offered as a hint.
 */
interface Input {
  url: string;
  topic: string;
  relationId?: string;
}

const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Create a new account webhook for a given URL and topic. Paid plans only.",
  idempotent: false,
  params: [
    { key: "url", label: "Webhook URL", type: "string", required: true },
    {
      key: "topic",
      label: "Topic",
      type: "string",
      required: true,
      hint: "Confirmed values: groups/new-subscriber, campaigns/new. Sender's own docs do not " +
        "enumerate the full topic list.",
    },
    {
      key: "relationId",
      label: "Relation ID",
      type: "string",
      hint: "Required only when topic is groups/new-subscriber or groups/unsubscribed — the " +
        "group ID to track.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Webhook ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/account/webhooks", {
      method: "POST",
      body: compact({ url: input.url, topic: input.topic, relation_id: input.relationId }),
    });
  },
};

export default webhookCreate;
