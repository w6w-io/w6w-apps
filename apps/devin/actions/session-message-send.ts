import type { ActionDefinition } from "@w6w/types";
import { compact, DevinClient, type DevinSession, toList } from "../lib/client.ts";
import { devinIdParam } from "../lib/params.ts";

/**
 * `POST /v3/organizations/{org_id}/sessions/{devin_id}/messages` — send a
 * follow-up message into an existing session. Devin resumes the session
 * automatically if it was suspended.
 *
 * This is how a workflow steers a long-running session ("looks good, now add
 * tests", "use the staging database instead") without starting a new one —
 * starting a new session loses everything the first one already did.
 *
 * `idempotent: false`: resending an identical message is a second real
 * instruction to the agent, not a safe retry.
 */
interface Input {
  devinId: string;
  message: string;
  attachmentUrls?: string[] | string;
}

const sessionMessageSend: ActionDefinition<Input, DevinSession> = {
  key: "session-message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a follow-up message into an existing (or suspended) session.",
  idempotent: false,
  params: [
    devinIdParam,
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "attachmentUrls",
      label: "Attachment URLs",
      type: "multiselect",
      options: [],
      advanced: true,
      hint: "URLs from a prior attachment-upload call.",
    },
  ],
  output: [
    { key: "session_id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "acus_consumed", type: "number", label: "Compute units consumed so far" },
  ],

  execute(input, ctx) {
    return new DevinClient(ctx).org<DevinSession>(
      `/sessions/${encodeURIComponent(input.devinId)}/messages`,
      {
        method: "POST",
        body: compact({ message: input.message, attachment_urls: toList(input.attachmentUrls) }),
      },
    );
  },
};

export default sessionMessageSend;
