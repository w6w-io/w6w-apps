import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SenderClient } from "../lib/client.ts";

/**
 * `POST /v2/events` — creates a custom event for a subscriber, for triggering
 * automations from outside data.
 */
interface Input {
  subscriberId?: string;
  subscriberEmail?: string;
  subscriberPhone?: string;
  type: string;
  value?: number;
  valueCurrency?: string;
  properties?: unknown;
}

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Custom Event",
  description: "Record a custom event against a subscriber, e.g. to trigger an automation.",
  idempotent: false,
  params: [
    {
      key: "subscriberId",
      label: "Subscriber ID",
      type: "string",
      hint: "At least one of Subscriber ID, Email, or Phone is required.",
    },
    { key: "subscriberEmail", label: "Subscriber email", type: "string" },
    { key: "subscriberPhone", label: "Subscriber phone", type: "string" },
    {
      key: "type",
      label: "Event type",
      type: "string",
      required: true,
      placeholder: "product_viewed",
      hint: "A short event-type name.",
    },
    { key: "value", label: "Value", type: "number", hint: "Optional numeric value for the event." },
    {
      key: "valueCurrency",
      label: "Value currency",
      type: "string",
      placeholder: "USD",
      hint: "ISO 4217 currency code, e.g. USD or EUR.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      hint: "Flat key/value map. Text values must not exceed 2KB; total properties size must " +
        "not exceed 8KB.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    const subscriber = compact({
      id: input.subscriberId,
      email: input.subscriberEmail,
      phone: input.subscriberPhone,
    });
    if (Object.keys(subscriber).length === 0) {
      throw new Error(
        "At least one of subscriberId, subscriberEmail, or subscriberPhone is required",
      );
    }
    return new SenderClient(ctx).data("/events", {
      method: "POST",
      body: compact({
        subscriber,
        type: input.type,
        value: input.value,
        value_currency: input.valueCurrency,
        properties: asOptionalJson<Record<string, unknown>>(input.properties, "properties"),
      }),
    });
  },
};

export default eventCreate;
