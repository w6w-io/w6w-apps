import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, compact } from "../lib/client.ts";

/**
 * `POST /webhook/subscribe` (note: not `POST /webhook` — the vendor's create
 * path is distinct from the list/get/update/delete path, `/webhook/{id}`).
 *
 * Affinity allows at most three webhook subscriptions per instance.
 */
export const webhookEventOptions = [
  { value: "list.created", label: "List created" },
  { value: "list.updated", label: "List updated" },
  { value: "list.deleted", label: "List deleted" },
  { value: "list_entry.created", label: "List entry created" },
  { value: "list_entry.deleted", label: "List entry deleted" },
  { value: "note.created", label: "Note created" },
  { value: "note.updated", label: "Note updated" },
  { value: "note.deleted", label: "Note deleted" },
  { value: "field.created", label: "Field created" },
  { value: "field.updated", label: "Field updated" },
  { value: "field.deleted", label: "Field deleted" },
  { value: "field_value.created", label: "Field value created" },
  { value: "field_value.updated", label: "Field value updated" },
  { value: "field_value.deleted", label: "Field value deleted" },
  { value: "person.created", label: "Person created" },
  { value: "person.updated", label: "Person updated" },
  { value: "person.deleted", label: "Person deleted" },
  { value: "organization.created", label: "Organization created" },
  { value: "organization.updated", label: "Organization updated" },
  { value: "organization.deleted", label: "Organization deleted" },
  { value: "organization.merged", label: "Organization merged" },
  { value: "opportunity.created", label: "Opportunity created" },
  { value: "opportunity.updated", label: "Opportunity updated" },
  { value: "opportunity.deleted", label: "Opportunity deleted" },
  { value: "file.created", label: "File created" },
  { value: "file.deleted", label: "File deleted" },
  { value: "reminder.created", label: "Reminder created" },
  { value: "reminder.updated", label: "Reminder updated" },
  { value: "reminder.deleted", label: "Reminder deleted" },
];

interface Input {
  webhookUrl: string;
  subscriptions?: string[];
}

const webhooksCreate: ActionDefinition<Input> = {
  key: "webhooks-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook Subscription",
  description:
    "Subscribe a URL to Affinity events. Leave subscriptions empty to receive every event type. " +
    "Limit of 3 subscriptions per Affinity instance.",
  idempotent: false,
  params: [
    { key: "webhookUrl", label: "Webhook URL", type: "string", required: true },
    {
      key: "subscriptions",
      label: "Event types",
      type: "multiselect",
      options: webhookEventOptions,
      hint: "Leave empty to subscribe to all event types.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Webhook Subscription ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json("/webhook/subscribe", {
      method: "POST",
      body: compact({ webhook_url: input.webhookUrl, subscriptions: input.subscriptions }),
    });
  },
};

export default webhooksCreate;
