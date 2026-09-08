import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, TIME_TRACKING_HOST } from "../lib/client.ts";

/**
 * `PATCH /v1/TimeEntries/{id}` — correct a time entry's activity/project or note.
 *
 * Note the path shape: a plain `/TimeEntries/{id}` segment, NOT the `TimeEntries(id)`
 * OData-parenthesis form every other singular update in this app uses. See
 * `lib/client.ts`'s module doc for why that distinction matters.
 *
 * Answers `204 No Content` on success.
 */
interface Input {
  timeEntryId: string;
  activityId?: string;
  projectId?: string;
  note?: string;
}

const timeEntryUpdate: ActionDefinition<Input> = {
  key: "time-entry-update",
  type: "perform",
  resource: "time-entry",
  title: "Update Time Entry",
  description: "Correct a time entry's activity, project, or note.",
  idempotent: true,
  params: [
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
    { key: "activityId", label: "Activity ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    { key: "note", label: "Note", type: "text" },
  ],
  output: [{ key: "ok", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    if (!input.timeEntryId) throw new Error("timeEntryId is required");
    const body: Record<string, unknown> = {};
    if (input.activityId !== undefined) body.activityId = input.activityId;
    if (input.projectId !== undefined) body.projectId = input.projectId;
    if (input.note !== undefined) body.note = input.note;
    if (Object.keys(body).length === 0) throw new Error("at least one field to update is required");

    const status = await new JibbleClient(ctx).status(
      TIME_TRACKING_HOST,
      `/v1/TimeEntries/${encodeURIComponent(input.timeEntryId)}`,
      { method: "PATCH", body },
    );
    return { ok: status >= 200 && status < 300 };
  },
};

export default timeEntryUpdate;
