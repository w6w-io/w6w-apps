import type { ActionDefinition } from "@w6w/types";
import { CrispClient } from "../lib/client.ts";

type Input = Record<string, never>;

export interface CrispNewConversation {
  session_id?: string;
}

/**
 * `POST /v1/website/{website_id}/conversation` — creates a new, empty
 * conversation session and returns its `session_id`. Confirmed against the
 * reference's embedded example: request body is `{}` (no fields), response
 * `{"error": false, "reason": "added", "data": {"session_id":
 * "session_700c65e1-..."}}`.
 *
 * Per the reference's own description, the new session "will not be visible
 * in your Crisp Inbox until a message is sent with an user `from` value" —
 * follow up with `send-message`.
 */
const createConversation: ActionDefinition<Input, CrispNewConversation | undefined> = {
  key: "create-conversation",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation",
  description: "Creates a new, empty conversation session. Send a message to make it visible.",
  idempotent: false,
  params: [],
  output: [{ key: "session_id", type: "string", label: "Session ID" }],

  execute(_input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<CrispNewConversation>("/conversation", {
      method: "POST",
      body: {},
    });
  },
};

export default createConversation;
