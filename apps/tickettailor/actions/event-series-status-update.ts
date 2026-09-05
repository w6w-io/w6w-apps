import type { ActionDefinition } from "@w6w/types";
import { TicketTailorClient } from "../lib/client.ts";

/** `POST /v1/event_series/{event_series_id}/status` — verified against `changeEventSeriesStatus`, 2026-09-05. */
interface Input {
  eventSeriesId: string;
  status: "DRAFT" | "PUBLISHED" | "CLOSE_SALES";
}

const eventSeriesStatusUpdate: ActionDefinition<Input> = {
  key: "event-series-status-update",
  type: "perform",
  resource: "event-series",
  title: "Change Event Series Status",
  description: "Publish, unpublish (draft), or close sales on an event series.",
  idempotent: true,
  params: [
    {
      key: "eventSeriesId",
      label: "Event Series ID",
      type: "string",
      required: true,
      placeholder: "es_123",
    },
    {
      key: "status",
      label: "New status",
      type: "select",
      required: true,
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Published", value: "PUBLISHED" },
        { label: "Close sales", value: "CLOSE_SALES" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event series ID" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(input, ctx) {
    return new TicketTailorClient(ctx).request(
      `/event_series/${encodeURIComponent(input.eventSeriesId)}/status`,
      { method: "POST", form: { status: input.status } },
    );
  },
};

export default eventSeriesStatusUpdate;
