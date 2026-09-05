import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  DevinClient,
  type DevinListPage,
  type SearchResult,
  toSearchResult,
} from "../lib/client.ts";
import { cursorParams, devinIdParam } from "../lib/params.ts";

/** `SessionMessage` — one message in a session's transcript. */
interface SessionMessage {
  event_id: string;
  source: "devin" | "user";
  message: string;
  created_at: number;
}

/**
 * `GET /v3/organizations/{org_id}/sessions/{devin_id}/messages` — a session's
 * message transcript, oldest first, cursor-paginated.
 *
 * This — not a separate "get output" endpoint — is how a workflow reads back
 * what Devin said: `source: "devin"` entries are the agent's own updates,
 * `source: "user"` are prompts and follow-ups (including ones sent by
 * `session-message-send`).
 */
interface Input {
  devinId: string;
  cursor?: string;
  limit?: number;
}

const sessionMessageList: ActionDefinition<Input, SearchResult<SessionMessage>> = {
  key: "session-message-list",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List a session's messages, ordered chronologically.",
  params: [devinIdParam, ...cursorParams(100)],
  output: [
    { key: "items", type: "array", label: "Messages" },
    { key: "nextCursor", type: "string", label: "Pass into `cursor` for the next page" },
  ],

  async execute(input, ctx) {
    const page = await new DevinClient(ctx).org<DevinListPage<SessionMessage>>(
      `/sessions/${encodeURIComponent(input.devinId)}/messages`,
      { query: compact({ after: input.cursor, first: input.limit }) },
    );
    return toSearchResult(page);
  },
};

export default sessionMessageList;
