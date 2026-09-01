import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
  fields: unknown;
}

const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time-entry",
  title: "Update Time Entry",
  description: "Update an existing time entry's fields.",
  // PUTting the same field set twice converges on the same record.
  idempotent: true,
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of FreshBooks time entry field names -> values, e.g. { "duration": 600 }.',
    },
  ],
  output: [{ key: "time_entry", type: "object", label: "Time entry" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "timetracking",
      `/time_entries/${encodeURIComponent(input.timeEntryId)}`,
      { method: "PUT", body: { time_entry: jsonObject(input.fields, "fields") } },
    );
  },
};

export default timeEntryUpdate;
