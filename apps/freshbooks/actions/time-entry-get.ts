import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient } from "../lib/client.ts";

interface Input {
  timeEntryId: string;
}

const timeEntryGet: ActionDefinition<Input> = {
  key: "time-entry-get",
  type: "read",
  resource: "time-entry",
  title: "Get Time Entry",
  description: "Get a single time entry by id.",
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [{ key: "time_entry", type: "object", label: "Time entry" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "timetracking",
      `/time_entries/${encodeURIComponent(input.timeEntryId)}`,
    );
  },
};

export default timeEntryGet;
