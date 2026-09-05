import type { ActionDefinition } from "@w6w/types";
import type { DeleteResult } from "../lib/client.ts";
import { TicketTailorClient } from "../lib/client.ts";

/**
 * `DELETE /v1/event_series/{event_series_id}` — verified against
 * `deleteEventSeriesById`, 2026-09-05. Irreversible: deletes every event
 * occurrence in the series too. Answers `200` with a small JSON body, never
 * `204` — see `lib/client.ts`.
 */
interface Input {
  eventSeriesId: string;
}

const eventSeriesDelete: ActionDefinition<Input, DeleteResult> = {
  key: "event-series-delete",
  type: "perform",
  resource: "event-series",
  title: "Delete Event Series",
  description: "Permanently delete an event series and every event occurrence in it. Irreversible.",
  idempotent: false,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted event series ID" },
    { key: "object", type: "string", label: "Object type" },
    { key: "deleted", type: "string", label: '"true" on success' },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request<DeleteResult>(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}`,
      { method: "DELETE" },
    );
  },
};

export default eventSeriesDelete;
