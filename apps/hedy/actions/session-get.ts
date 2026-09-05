import type { ActionDefinition } from "@w6w/types";
import { HedyClient } from "../lib/client.ts";

/**
 * `GET /sessions/{sessionId}` — full detail for one meeting session.
 *
 * Per the `SessionDetail` schema this is the only place the full
 * `transcript`, `conversations` (structured Q&A history) and `meeting_minutes`
 * fields are returned — `sessions-list` carries only `recap`.
 */
interface Input {
  sessionId: string;
}

const sessionGet: ActionDefinition<Input> = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get Session",
  description: "Fetch full detail for one meeting session, including its transcript and minutes.",
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "e.g. sess_123456789 — from sessions-list's `id` field.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "startTime", type: "string", label: "Start time (ISO 8601)" },
    { key: "endTime", type: "string", label: "End time (ISO 8601)" },
    { key: "duration", type: "number", label: "Duration in minutes" },
    { key: "transcript", type: "string", label: "Full meeting transcript" },
    { key: "conversations", type: "string", label: "Structured conversation history" },
    { key: "meeting_minutes", type: "string", label: "Formatted meeting minutes" },
    { key: "recap", type: "string", label: "Brief meeting summary" },
  ],

  async execute(input, ctx) {
    const { data } = await new HedyClient(ctx).get(
      `/sessions/${encodeURIComponent(input.sessionId)}`,
    );
    return data;
  },
};

export default sessionGet;
