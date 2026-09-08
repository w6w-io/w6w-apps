import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `PATCH /v1/TimeEntries/{id}` with `{"status": "Archived"}` — the collection's own "Delete
 * Time Entry" request. Despite the vendor's label, this is a soft delete (a status flip on a
 * plain `PATCH`), not an HTTP `DELETE` — unlike `member-delete`, which really does remove the
 * row. Named `time-entry-archive` here rather than `time-entry-delete` so the action's own
 * name doesn't repeat the vendor's misleading one.
 */
interface Input {
  timeEntryId: string;
}

const timeEntryArchive: ActionDefinition<Input> = {
  key: "time-entry-archive",
  type: "perform",
  resource: "time-entry",
  title: "Archive Time Entry",
  description: 'Soft-delete a time entry (Jibble\'s own "Delete Time Entry" — a status flip, ' +
    "not a hard delete).",
  idempotent: true,
  params: [{ key: "timeEntryId", label: "Time Entry ID", type: "string", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Archived" }],

  async execute(input, ctx) {
    if (!input.timeEntryId) throw new Error("timeEntryId is required");
    const status = await new JibbleClient(ctx).status(
      TIME_TRACKING_HOST,
      `/v1/TimeEntries/${encodeURIComponent(input.timeEntryId)}`,
      { method: "PATCH", body: { status: "Archived" } },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default timeEntryArchive;
