import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/** `POST /v1/TimeEntries` with `type: "Out"` — clock a person out. */
interface Input {
  personId: string;
  note?: string;
}

const timeEntryClockOut: ActionDefinition<Input> = {
  key: "time-entry-clock-out",
  type: "perform",
  resource: "time-entry",
  title: "Clock Out",
  description: "Clock a member out.",
  idempotent: false,
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "time", type: "string", label: "Clock time (UTC)" },
  ],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    return await new JibbleClient(ctx).json(TIME_TRACKING_HOST, "/v1/TimeEntries", {
      method: "POST",
      body: {
        personId: input.personId,
        type: "Out",
        note: input.note || undefined,
        // See time-entry-clock-in.ts — "Web" is the only confirmed-working value.
        clientType: "Web",
      },
    });
  },
};

export default timeEntryClockOut;
