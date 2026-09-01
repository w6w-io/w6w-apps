import type { ActionDefinition } from "@w6w/types";
import { compact, CrispClient } from "../lib/client.ts";

interface Input {
  sessionId: string;
  timestampBefore?: number;
  timestampAfter?: number;
  timestampAround?: number;
}

export interface CrispMessage {
  session_id?: string;
  website_id?: string;
  type?: string;
  from?: "user" | "operator";
  origin?: string;
  content?: unknown;
  fingerprint?: number;
  timestamp?: number;
  read?: boolean;
}

/**
 * `GET /v1/website/{website_id}/conversation/{session_id}/messages` —
 * returns the most recent batch of messages. Per the reference: page towards
 * older messages with `timestamp_before`, towards newer with
 * `timestamp_after`, or centered on a point with `timestamp_around`. Only
 * one of the three is meaningful per call; this action passes through
 * whichever the caller sets.
 */
const listMessages: ActionDefinition<Input, CrispMessage[] | undefined> = {
  key: "list-messages",
  type: "search",
  resource: "message",
  title: "List Messages",
  description: "List messages in a conversation, newest batch first.",
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
    },
    {
      key: "timestampBefore",
      label: "Before timestamp",
      type: "number",
      hint: "Page towards older messages, ending before this timestamp (ms).",
    },
    {
      key: "timestampAfter",
      label: "After timestamp",
      type: "number",
      hint: "Page towards newer messages, starting after this timestamp (ms).",
    },
    {
      key: "timestampAround",
      label: "Around timestamp",
      type: "number",
      hint: "Center the returned batch on this timestamp (ms).",
    },
  ],
  output: [
    { key: "fingerprint", type: "number", label: "Fingerprint" },
    { key: "type", type: "string", label: "Type" },
    { key: "from", type: "string", label: "From" },
    { key: "content", type: "object", label: "Content" },
    { key: "timestamp", type: "number", label: "Timestamp" },
  ],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispMessage[]>(
      `/conversation/${encodeURIComponent(input.sessionId)}/messages`,
      {
        query: compact({
          timestamp_before: input.timestampBefore,
          timestamp_after: input.timestampAfter,
          timestamp_around: input.timestampAround,
        }),
      },
    );
  },
};

export default listMessages;
