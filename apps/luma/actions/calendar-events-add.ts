import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";

interface Input {
  platform: "luma" | "external";
  submissionMode?: "auto" | "pending";
  // luma
  eventId?: string;
  // external
  url?: string;
  name?: string;
  startAt?: string;
  durationInterval?: string;
  timezone?: string;
}

/**
 * `POST /v1/calendars/events/add`.
 *
 * The vendor's body is a `oneOf` keyed by `platform`: `luma` (add an
 * existing Luma event to this calendar by `event_id`) or `external`
 * (list a non-Luma event by URL). Both branches share this one Action —
 * `platform` picks which fields are sent — rather than splitting into two
 * Actions, because they are one vendor operation with one response shape.
 */
const calendarEventsAdd: ActionDefinition<Input> = {
  key: "calendar-events-add",
  type: "perform",
  resource: "event",
  title: "Add Event to Calendar",
  description:
    "Add an event to the connected calendar — an existing Luma event by ID, or an external " +
    "(non-Luma) event by URL.",
  idempotent: false,
  params: [
    {
      key: "platform",
      label: "Platform",
      type: "select",
      required: true,
      options: [
        { value: "luma", label: "Luma event" },
        { value: "external", label: "External event" },
      ],
    },
    {
      key: "submissionMode",
      label: "Submission mode",
      type: "select",
      default: "auto",
      options: [
        { value: "auto", label: "Auto-approve" },
        { value: "pending", label: "Pending admin approval" },
      ],
    },
    {
      key: "eventId",
      label: "Event",
      type: "string",
      placeholder: "evt-abc123",
      hint: "Luma platform only — the event to add.",
      showIf: { "==": [{ var: "platform" }, "luma"] },
    },
    {
      key: "url",
      label: "External URL",
      type: "string",
      hint: "External platform only, required.",
      showIf: { "==": [{ var: "platform" }, "external"] },
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "External platform only, required.",
      showIf: { "==": [{ var: "platform" }, "external"] },
    },
    {
      key: "startAt",
      label: "Start at",
      type: "datetime",
      hint: "External platform only, required. ISO 8601 datetime.",
      showIf: { "==": [{ var: "platform" }, "external"] },
    },
    {
      key: "durationInterval",
      label: "Duration",
      type: "string",
      hint: "External platform only, required. ISO 8601 duration, e.g. PT1H.",
      showIf: { "==": [{ var: "platform" }, "external"] },
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      hint: "External platform only, required. IANA timezone, e.g. America/New_York.",
      showIf: { "==": [{ var: "platform" }, "external"] },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Calendar event ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const body = input.platform === "luma"
      ? compact({
        platform: "luma",
        submission_mode: input.submissionMode,
        event_id: input.eventId,
      })
      : compact({
        platform: "external",
        submission_mode: input.submissionMode,
        url: input.url,
        name: input.name,
        start_at: input.startAt,
        duration_interval: input.durationInterval,
        timezone: input.timezone,
      });
    return new LumaClient(ctx).json("/v1/calendars/events/add", { method: "POST", body });
  },
};

export default calendarEventsAdd;
