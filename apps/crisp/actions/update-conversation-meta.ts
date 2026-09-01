import type { ActionDefinition } from "@w6w/types";
import { compact, CrispClient, csv } from "../lib/client.ts";

interface Input {
  sessionId: string;
  nickname?: string;
  email?: string;
  phone?: string;
  address?: string;
  subject?: string;
  segments?: string;
}

type Output = Record<string, never>;

/**
 * `PATCH /v1/website/{website_id}/conversation/{session_id}/meta` — updates
 * visitor/conversation metadata. The reference's `meta` body is large
 * (device/geolocation/system info a workflow has no business setting); this
 * action exposes the fields an automation actually writes — visitor
 * identity, subject line, segments — and leaves the device/system nesting
 * out. Confirmed via the reference's embedded example
 * (`{"nickname", "email", "segments": [...], "data": {...}}` ->
 * `{"error": false, "reason": "updated", "data": {}}`).
 */
const updateConversationMeta: ActionDefinition<Input, Output | undefined> = {
  key: "update-conversation-meta",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation Meta",
  description: "Updates a conversation's visitor identity, subject, or segments.",
  idempotent: true,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true },
    { key: "nickname", label: "Visitor nickname", type: "string" },
    { key: "email", label: "Visitor email", type: "string" },
    { key: "phone", label: "Visitor phone", type: "string" },
    { key: "address", label: "Visitor address", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    {
      key: "segments",
      label: "Segments",
      type: "string",
      hint: "Comma-separated list, e.g. `happy, customer`. Replaces the existing segment list.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const client = new CrispClient(ctx);
    return client.request<Output>(
      `/conversation/${encodeURIComponent(input.sessionId)}/meta`,
      {
        method: "PATCH",
        body: compact({
          nickname: input.nickname,
          email: input.email,
          phone: input.phone,
          address: input.address,
          subject: input.subject,
          segments: csv(input.segments),
        }),
      },
    );
  },
};

export default updateConversationMeta;
