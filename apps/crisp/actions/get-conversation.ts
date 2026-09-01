import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";
import type { CrispConversationSummary } from "./list-conversations.ts";

interface Input {
  sessionId: string;
}

/**
 * `GET /v1/website/{website_id}/conversation/{session_id}` — resolves a
 * single conversation's full information. Shares its response shape with
 * `list-conversations` (same `session_id`/`state`/... fields, plus more
 * detail this action doesn't separately enumerate).
 */
const getConversation: ActionDefinition<Input, CrispConversationSummary | undefined> = {
  key: "get-conversation",
  type: "read",
  resource: "conversation",
  title: "Get Conversation",
  description: "Resolves a single conversation's information by session ID.",
  params: [
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      required: true,
      hint: "The conversation session identifier, e.g. session_xxxxxxxx.",
    },
  ],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "state", type: "string", label: "State" },
    { key: "is_verified", type: "boolean", label: "Verified" },
    { key: "is_blocked", type: "boolean", label: "Blocked" },
    { key: "topic", type: "string", label: "Topic" },
  ],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispConversationSummary>(
      `/conversation/${encodeURIComponent(input.sessionId)}`,
    );
  },
};

export default getConversation;
