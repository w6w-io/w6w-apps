import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `POST /v1/event_series/{event_series_id}/events` — verified against
 * `createEventSeriesEvent`, 2026-09-05. Dates are `YYYY-MM-DD`, times are
 * `HH:mm:ss`, exactly as the vendor's own examples show.
 */
interface Input {
  eventSeriesId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  hidden?: boolean;
  unavailable?: boolean;
  unavailableStatus?: string;
  onlineLink?: string;
  overrideId?: string;
}

const eventOccurrenceCreate: ActionDefinition<Input> = {
  key: "event-occurrence-create",
  type: "perform",
  resource: "event-occurrence",
  title: "Create Event Occurrence",
  description: "Add a new date/occurrence to an existing event series.",
  idempotent: false,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    { key: "startDate", label: "Start date (YYYY-MM-DD)", type: "string", required: true },
    { key: "endDate", label: "End date (YYYY-MM-DD)", type: "string", required: true },
    { key: "startTime", label: "Start time (HH:mm:ss)", type: "string" },
    { key: "endTime", label: "End time (HH:mm:ss)", type: "string" },
    { key: "hidden", label: "Hidden", type: "boolean" },
    { key: "unavailable", label: "Unavailable", type: "boolean" },
    { key: "unavailableStatus", label: "Unavailable status message", type: "string" },
    { key: "onlineLink", label: "Online event URL", type: "string" },
    { key: "overrideId", label: "Override ID to apply", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Event occurrence ID" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/events`,
      {
        method: "POST",
        form: {
          start_date: input.startDate,
          end_date: input.endDate,
          start_time: input.startTime,
          end_time: input.endTime,
          hidden: input.hidden,
          unavailable: input.unavailable,
          unavailable_status: input.unavailableStatus,
          online_link: input.onlineLink,
          override_id: input.overrideId,
        },
      },
    );
  },
};

export default eventOccurrenceCreate;
