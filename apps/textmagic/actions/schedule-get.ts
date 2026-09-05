import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `GET /api/v2/schedules/{id}` — one scheduled message's details. */
interface Input {
  id: number;
}

const scheduleGet: ActionDefinition<Input> = {
  key: "schedule-get",
  type: "read",
  resource: "schedule",
  title: "Get Scheduled Message",
  description: "Fetch one scheduled (future or recurring) message.",
  params: [{ key: "id", label: "Schedule ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Schedule ID" },
    { key: "nextSend", type: "string", label: "Next send time (ISO 8601)" },
    { key: "rrule", type: "string", label: "iCal RRULE, if recurring" },
    { key: "lastSent", type: "string", label: "Last send time, if any" },
    { key: "completed", type: "boolean", label: "Whether the schedule has finished" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/schedules/${encodeURIComponent(input.id)}`);
  },
};

export default scheduleGet;
