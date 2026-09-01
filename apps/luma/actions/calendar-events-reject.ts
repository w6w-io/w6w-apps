import type { ActionDefinition } from "@w6w/types";
import { compact, LumaClient } from "../lib/client.ts";

interface Input {
  calendarEventId: string;
  message?: string;
}

/** `POST /v1/calendars/events/reject`. Empty response on success. */
const calendarEventsReject: ActionDefinition<Input> = {
  key: "calendar-events-reject",
  type: "perform",
  resource: "event",
  title: "Reject Calendar Event Submission",
  description: "Reject a pending event submission on the connected calendar.",
  idempotent: true,
  params: [
    {
      key: "calendarEventId",
      label: "Calendar event",
      type: "string",
      required: true,
      placeholder: "calev-abc123",
      hint: "Calendar event ID (starts with `calev-`), or the Luma event ID (`evt-`) — Luma " +
        "resolves it to the active submission.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      hint: "Optional message sent to the submitter explaining the rejection.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/calendars/events/reject", {
      method: "POST",
      body: compact({ calendar_event_id: input.calendarEventId, message: input.message }),
    });
    return { ok: true };
  },
};

export default calendarEventsReject;
