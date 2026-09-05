import type { ActionDefinition } from "@w6w/types";
import { type JsonApiCollection, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  startsAfter?: string;
  startsBefore?: string;
  perPage?: number;
  offset?: number;
}

interface EventInstanceAttributes {
  starts_at?: string;
  ends_at?: string;
  all_day_event?: boolean;
  location?: string;
  church_center_url?: string;
  recurrence_description?: string;
}

interface Output {
  eventInstances: Array<{
    id: string;
    eventId?: string;
    startsAt?: string;
    endsAt?: string;
    allDayEvent?: boolean;
    location?: string;
    churchCenterUrl?: string;
  }>;
  totalCount?: number;
  nextOffset?: number;
}

/**
 * `GET /calendar/v2/event_instances`, NOT `/calendar/v2/events`.
 *
 * This is the single most likely trap in the Calendar API: `Event` is a
 * container resource with no start/end time of its own (verified against the
 * live `event_attributes` schema — it carries `name`, `approval_status`,
 * `visible_in_church_center`, but no date field at all). A recurring event is
 * one `Event` with many `EventInstance`s, and only `EventInstance` carries
 * `starts_at`/`ends_at`. An integration built against `/events` expecting
 * dates back will get schedule-less containers and either silently show
 * nothing or need a second, undocumented lookup to find out why. This action
 * reads instances directly so "when is it" always has an answer.
 *
 * `starts_at`/`ends_at` are documented as UTC.
 */
const listEventInstances: ActionDefinition<Input, Output> = {
  key: "list-event-instances",
  type: "search",
  title: "List Event Occurrences",
  description:
    "List scheduled event occurrences (with actual start/end times) from the Calendar module.",
  params: [
    {
      key: "startsAfter",
      label: "Starting on/after",
      type: "datetime",
      row: "range",
      hint: "ISO 8601 datetime, UTC.",
    },
    { key: "startsBefore", label: "Starting on/before", type: "datetime", row: "range" },
    { key: "perPage", label: "Per page", type: "number", default: 25, hint: "Maximum 100." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "eventInstances", type: "array", label: "Event occurrences" },
    { key: "totalCount", type: "number", label: "Total count" },
    { key: "nextOffset", type: "number", label: "Next page offset" },
  ],

  async execute(input, ctx) {
    const client = new PlanningCenterClient(ctx);
    const body = await client.get<JsonApiCollection<EventInstanceAttributes>>(
      "calendar",
      "/event_instances",
      {
        where: {
          starts_at: { gte: input.startsAfter, lte: input.startsBefore },
        },
        query: { per_page: input.perPage ?? 25, offset: input.offset ?? 0, order: "starts_at" },
      },
    );

    return {
      eventInstances: body.data.map((e) => ({
        id: e.id,
        eventId: (e.relationships?.event?.data as { id?: string } | undefined)?.id,
        startsAt: e.attributes.starts_at,
        endsAt: e.attributes.ends_at,
        allDayEvent: e.attributes.all_day_event,
        location: e.attributes.location,
        churchCenterUrl: e.attributes.church_center_url,
      })),
      totalCount: body.meta?.total_count,
      nextOffset: body.meta?.next?.offset,
    };
  },
};

export default listEventInstances;
