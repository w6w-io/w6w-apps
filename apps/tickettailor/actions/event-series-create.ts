import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/event_series` — verified against `createEventSeries`, 2026-09-05.
 * Sent as `application/x-www-form-urlencoded`, per this app's `lib/client.ts`.
 */
interface Input {
  name: string;
  venue?: string;
  description?: string;
  currency?: string;
  country?: string;
  postalCode?: string;
  maxTicketsSoldPerOccurrence?: number;
  onlinePlatform?: string;
  accessCode?: string;
  waitlistActive?: "true" | "false" | "no_tickets_available";
}

const eventSeriesCreate: ActionDefinition<Input> = {
  key: "event-series-create",
  type: "perform",
  resource: "event-series",
  title: "Create Event Series",
  description: "Create a new event series (the container events/occurrences belong to).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Tulip Festival" },
    { key: "venue", label: "Venue", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "currency",
      label: "Currency (ISO 4217, lowercase)",
      type: "string",
      placeholder: "gbp",
    },
    { key: "country", label: "Country (ISO 3166)", type: "string", placeholder: "GB" },
    { key: "postalCode", label: "Postal code", type: "string" },
    {
      key: "maxTicketsSoldPerOccurrence",
      label: "Max tickets sold per occurrence",
      type: "number",
    },
    {
      key: "onlinePlatform",
      label: "Online platform",
      type: "string",
      hint: "e.g. Zoom — set when the event series is held online-only.",
    },
    { key: "accessCode", label: "Access code", type: "secret", hint: "Gates a protected series." },
    {
      key: "waitlistActive",
      label: "Waitlist",
      type: "select",
      options: [
        { label: "Off", value: "false" },
        { label: "On", value: "true" },
        { label: "Only when sold out", value: "no_tickets_available" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event series ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request("/event_series", {
      method: "POST",
      form: {
        name: input.name,
        venue: input.venue,
        description: input.description,
        currency: input.currency,
        country: input.country,
        postal_code: input.postalCode,
        max_tickets_sold_per_occurrence: input.maxTicketsSoldPerOccurrence,
        online_platform: input.onlinePlatform,
        access_code: input.accessCode,
        waitlist_active: input.waitlistActive,
      },
    });
  },
};

export default eventSeriesCreate;
