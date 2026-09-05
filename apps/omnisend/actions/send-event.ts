import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  eventName: string;
  origin?: string;
  eventID?: string;
  eventTime?: string;
  eventVersion?: string;
  properties?: Record<string, unknown>;
  contact?: Record<string, unknown>;
}

/**
 * Sends a customer event — a "recommended" event Omnisend has pre-built
 * automations, segments and reporting for (e.g. `placed order`), or a
 * free-form custom event — to trigger Omnisend automations. This is the
 * mechanism a workflow uses to make Omnisend react to something that just
 * happened, rather than only reading/writing contact records.
 *
 * Accepted asynchronously; the 202 response carries no body.
 * https://api-docs.omnisend.com/reference/post_events
 */
const sendEvent: ActionDefinition<Input, void> = {
  key: "send-event",
  type: "perform",
  resource: "event",
  title: "Send Customer Event",
  description:
    'Send a recommended (e.g. "placed order") or custom event to trigger Omnisend automations, ' +
    "segments, and reporting.",
  // Event deduplication via eventID+eventTime only applies to historical
  // events, not the real-time events used for automations, so a retried call
  // can create a second, distinct event.
  idempotent: false,
  params: [
    {
      key: "eventName",
      label: "Event name",
      type: "string",
      required: true,
      hint: 'A recommended event name (e.g. "placed order") or your own custom event name.',
    },
    {
      key: "origin",
      label: "Origin",
      type: "string",
      default: "api",
      hint: 'Source of the event: "api" for a custom store integration, or your app\'s own name ' +
        "if you're building a third-party integration.",
    },
    {
      key: "eventID",
      label: "Event ID",
      type: "string",
      hint: "UUID (v4/v5/v6/v7) for deduplicating historical events sent with the same eventTime " +
        "(has no effect on real-time automation triggers). Auto-generated if omitted.",
    },
    {
      key: "eventTime",
      label: "Event time",
      type: "string",
      hint: 'ISO 8601 / RFC 3339 timestamp, e.g. "2021-07-01T00:00:00Z". Defaults to now.',
    },
    {
      key: "eventVersion",
      label: "Event version",
      type: "string",
      hint: "Required only for recommended events — see that event's own documentation for the " +
        "version to send. Leave empty for custom events.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      hint: "Event payload. Recommended events expect specific properties — see Omnisend's " +
        "event reference for each one.",
    },
    {
      key: "contact",
      label: "Contact",
      type: "json",
      hint: 'Contact to create or update alongside this event, e.g. `{ "email": "a@b.com" }`.',
    },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request<void>(`/events`, {
      method: "POST",
      body: {
        eventName: input.eventName,
        origin: input.origin,
        eventID: input.eventID,
        eventTime: input.eventTime,
        eventVersion: input.eventVersion,
        properties: input.properties,
        contact: input.contact,
      },
    });
  },
};

export default sendEvent;
