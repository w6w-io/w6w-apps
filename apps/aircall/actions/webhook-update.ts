import type { ActionDefinition } from "@w6w/types";
import { AircallClient, compact, encodeId, stripWebhookToken, toList } from "../lib/client.ts";
import { webhookIdParam } from "../lib/params.ts";

interface Input {
  webhookId: string;
  url?: string;
  customName?: string;
  events?: string[] | string;
  eventsAction?: string;
  active?: boolean;
}

/**
 * `PUT /v1/webhooks/:webhook_id` — change a Webhook's URL, name, event list or
 * active flag.
 *
 * **The event list has a destructive default.** Aircall: "If the events field is
 * not specified, Webhook will be registered to all events by default. If you
 * don't want the events array to be overridden by the default value then please
 * specify query param `events_action=add`." So a PUT sent only to flip `active`
 * back on can silently re-subscribe the webhook to every event type. This action
 * defends against that in the obvious way: `events` is only sent when the caller
 * supplied it, and `events_action` is exposed so `add` / `remove` are reachable
 * rather than only whole-list replacement.
 *
 * Re-activating is the main reason to call this at all: Aircall automatically
 * deactivates a webhook whose endpoint keeps failing, and `active: true` is how
 * it comes back.
 *
 * The response carries the `token`, which this action strips — the secret is
 * issued by Create Webhook and this call is not issuing anything.
 */
const webhookUpdate: ActionDefinition<Input> = {
  key: "webhook-update",
  type: "perform",
  resource: "webhook",
  title: "Update Webhook",
  description:
    "Change a Webhook's URL, name, events or active flag — including re-activating one Aircall " +
    "auto-disabled. Use the events action to add or remove rather than replace.",
  // Safe to retry: it sets named fields to given values. The one way it would
  // not be is the vendor's "unspecified events means ALL events" default, and
  // this action never sends an unspecified events field.
  idempotent: true,
  params: [
    webhookIdParam,
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint:
        "Set true to re-activate a Webhook that Aircall automatically disabled after repeated " +
        "delivery failures.",
    },
    { key: "url", label: "Delivery URL", type: "string" },
    { key: "customName", label: "Name", type: "string" },
    {
      key: "events",
      label: "Events",
      type: "multiselect",
      hint: "Only sent when you fill it in. Aircall treats an ABSENT events field on a PUT as " +
        '"subscribe to everything", so this action omits the field entirely when you leave it ' +
        "empty.",
    },
    {
      key: "eventsAction",
      label: "Events action",
      type: "select",
      options: [
        { value: "add", label: "Add — merge these events into the existing list" },
        { value: "remove", label: "Remove — drop these events from the existing list" },
      ],
      hint: "Leave empty to REPLACE the whole list with the events above.",
    },
  ],
  output: [
    { key: "webhook_id", type: "string", label: "Webhook UUID" },
    { key: "url", type: "string", label: "Delivery URL" },
    { key: "active", type: "boolean", label: "Active flag after the change" },
    { key: "events", type: "array", label: "Subscribed event names after the change" },
  ],

  async execute(input, ctx) {
    const events = toList(input.events);
    const body = compact({
      url: input.url,
      custom_name: input.customName,
      events,
      active: input.active,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Update Webhook needs at least one field to change");
    }
    const client = new AircallClient(ctx);
    const webhook = await client.entity<Record<string, unknown>>(
      `/webhooks/${encodeId(input.webhookId)}`,
      "webhook",
      {
        method: "PUT",
        // Only meaningful alongside an events list; sending it alone would ask
        // Aircall to add or remove nothing.
        query: { events_action: events ? input.eventsAction : undefined },
        body,
      },
    );
    return stripWebhookToken(webhook);
  },
};

export default webhookUpdate;
