import type { ActionDefinition } from "@w6w/types";
import { DevinClient, type DevinSession } from "../lib/client.ts";
import { devinIdParam } from "../lib/params.ts";

/**
 * `GET /v3/organizations/{org_id}/sessions/{devin_id}` — a session's current
 * status, URL, pull requests, compute spend and structured output.
 *
 * This is Devin's own answer to "how is my session doing / what did it
 * produce" — there is no separate diff/file/commit-reading endpoint. A
 * session that opened a pull request reports it under `pull_requests`; a
 * session whose prompt asked for `structured_output_schema`-shaped output
 * reports it under `structured_output`. Anything conversational is on
 * `session-message-list` instead.
 */
interface Input {
  devinId: string;
}

const sessionGet: ActionDefinition<Input, DevinSession> = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get Session",
  description: "Fetch a session's current status, URL, pull requests and structured output.",
  params: [devinIdParam],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "status_detail", type: "string", label: "Status detail" },
    { key: "url", type: "string", label: "URL to view the session" },
    { key: "title", type: "string", label: "Title" },
    { key: "acus_consumed", type: "number", label: "Compute units consumed so far" },
    { key: "pull_requests", type: "array", label: "Pull requests the session has opened" },
    {
      key: "structured_output",
      type: "object",
      label: "Structured output, if the prompt asked for it",
    },
    { key: "tags", type: "array", label: "Tags" },
    { key: "is_archived", type: "boolean", label: "Whether the session is archived" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
    { key: "updated_at", type: "number", label: "Last updated at (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<DevinSession>(`/sessions/${encodeURIComponent(input.devinId)}`);
  },
};

export default sessionGet;
