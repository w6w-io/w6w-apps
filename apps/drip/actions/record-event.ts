import type { ActionDefinition } from "@w6w/types";
import { compact, DripClient, jsonObject, unset } from "../lib/client.ts";

interface Input {
  email: string;
  action: string;
  occurredAt?: string;
  prospect?: boolean;
  properties?: unknown;
}

/**
 * `POST /v2/:account_id/events`. Each call records a NEW event — replaying
 * the same call records the event again rather than converging on one, so
 * this is honestly non-idempotent (unlike the subscriber/tag upserts above).
 */
const recordEvent: ActionDefinition<Input> = {
  key: "record-event",
  type: "perform",
  resource: "event",
  title: "Record Event",
  description: "Record a custom event for a subscriber — the trigger Drip automations key off.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "action",
      label: "Action",
      type: "string",
      required: true,
      hint: 'The event name, e.g. "Started a trial".',
    },
    {
      key: "occurredAt",
      label: "Occurred at",
      type: "datetime",
      advanced: true,
      hint: "ISO-8601. Defaults to now.",
    },
    {
      key: "prospect",
      label: "Attach lead score",
      type: "boolean",
      advanced: true,
      default: true,
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      hint:
        'Custom event properties, e.g. { "affiliate_code": "XYZ" }. For a conversion, include a `value` (in cents).',
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Recorded" }],

  async execute(input, ctx) {
    // Responds 204 No Content.
    await new DripClient(ctx).request("/events", {
      method: "POST",
      body: {
        events: [
          compact({
            email: input.email,
            action: input.action,
            occurred_at: unset(input.occurredAt),
            prospect: input.prospect ?? true,
            properties: jsonObject(input.properties, "properties"),
          }),
        ],
      },
    });
    return { success: true };
  },
};

export default recordEvent;
