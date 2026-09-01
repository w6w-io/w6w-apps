import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";

interface Input {
  calendarEventId: string;
}

/** `POST /v1/calendars/events/approve`. Empty response on success. */
const calendarEventsApprove: ActionDefinition<Input> = {
  key: "calendar-events-approve",
  type: "perform",
  resource: "event",
  title: "Approve Calendar Event Submission",
  description: "Approve a pending event submission on the connected calendar.",
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
  ],
  output: [],

  async execute(input, ctx) {
    await new LumaClient(ctx).json("/v1/calendars/events/approve", {
      method: "POST",
      body: { calendar_event_id: input.calendarEventId },
    });
    return { ok: true };
  },
};

export default calendarEventsApprove;
