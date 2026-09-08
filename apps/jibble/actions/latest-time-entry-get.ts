import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `GET /v1/People(id)/LatestTimeEntry` — a person's current clock state. Answers `type: "In"`
 * if they're currently clocked in, `"Out"` otherwise (or nothing if they've never clocked in).
 */
interface Input {
  personId: string;
}

const latestTimeEntryGet: ActionDefinition<Input> = {
  key: "latest-time-entry-get",
  type: "read",
  resource: "time-entry",
  title: "Get Latest Time Entry",
  description: "Get a person's most recent clock in/out event — their current clock state.",
  params: [{ key: "personId", label: "Person ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Time entry ID" },
    { key: "type", type: "string", label: "In or Out" },
    { key: "time", type: "string", label: "Clock time (UTC)" },
  ],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    return await new JibbleClient(ctx).json(
      TIME_TRACKING_HOST,
      `/v1/People(${encodeURIComponent(input.personId)})/LatestTimeEntry`,
    );
  },
};

export default latestTimeEntryGet;
