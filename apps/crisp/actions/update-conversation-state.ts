import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";

interface Input {
  sessionId: string;
  state: "pending" | "unresolved" | "resolved";
}

type Output = Record<string, never>;

/**
 * `PATCH /v1/website/{website_id}/conversation/{session_id}/state` —
 * updates a conversation's state. Confirmed against the reference's
 * embedded example (`{"state": "unresolved"}` -> `{"error": false,
 * "reason": "updated", "data": {}}`). Setting the same state twice is a
 * no-op on Crisp's side, so this is safe to retry.
 */
const updateConversationState: ActionDefinition<Input, Output | undefined> = {
  key: "update-conversation-state",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation State",
  description: "Marks a conversation as pending, unresolved, or resolved.",
  idempotent: true,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    {
      key: "state",
      label: "State",
      type: "select",
      required: true,
      options: [
        { value: "pending", label: "Pending" },
        { value: "unresolved", label: "Unresolved" },
        { value: "resolved", label: "Resolved" },
      ],
    },
  ],
  output: [],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<Output>(
      `/conversation/${encodeURIComponent(input.sessionId)}/state`,
      { method: "PATCH", body: { state: input.state } },
    );
  },
};

export default updateConversationState;
