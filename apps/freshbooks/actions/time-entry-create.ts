import type { ActionDefinition } from "@w6w/types";
import { compact, FreshBooksClient, jsonObject, unset } from "../lib/client.ts";
import { additionalFields } from "../lib/params.ts";

interface Input {
  duration: number;
  startedAt: string;
  note?: string;
  clientId?: string;
  projectId?: string;
  isLogged?: boolean;
  additionalFields?: unknown;
}

const timeEntryCreate: ActionDefinition<Input> = {
  key: "time-entry-create",
  type: "perform",
  resource: "time-entry",
  title: "Create Time Entry",
  description: "Log a new time entry.",
  // FreshBooks mints a new time entry id per call and offers no request
  // key, so a retry creates a duplicate entry.
  idempotent: false,
  params: [
    { key: "duration", label: "Duration (seconds)", type: "number", required: true },
    {
      key: "startedAt",
      label: "Started at",
      type: "datetime",
      required: true,
      hint: "ISO-8601 UTC, e.g. 2026-08-16T20:00:00.000Z.",
    },
    { key: "note", label: "Note", type: "text" },
    { key: "clientId", label: "Client ID", type: "string" },
    { key: "projectId", label: "Project ID", type: "string" },
    {
      key: "isLogged",
      label: "Logged",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "False creates a running, unlogged timer instead of a completed entry.",
    },
    additionalFields,
  ],
  output: [{ key: "time_entry", type: "object", label: "Time entry" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request("timetracking", "/time_entries", {
      method: "POST",
      body: {
        time_entry: {
          duration: input.duration,
          started_at: input.startedAt,
          is_logged: input.isLogged ?? true,
          ...compact({
            note: unset(input.note),
            client_id: unset(input.clientId),
            project_id: unset(input.projectId),
          }),
          ...jsonObject(input.additionalFields, "additionalFields"),
        },
      },
    });
  },
};

export default timeEntryCreate;
