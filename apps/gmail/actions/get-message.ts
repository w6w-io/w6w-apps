import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  format?: "minimal" | "full" | "raw" | "metadata";
  metadataHeaders?: string[];
}

/**
 * Fetch a single message. `format` mirrors Gmail's own values:
 *   - `metadata` returns headers + labels only (cheap)
 *   - `full` (default) returns parsed payload trees
 *   - `raw` returns the base64url-encoded RFC 2822 blob
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Retrieve a single Gmail message by ID.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "full",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "full", label: "Full" },
        { value: "raw", label: "Raw" },
        { value: "metadata", label: "Metadata" },
      ],
    },
    {
      key: "metadataHeaders",
      label: "Metadata Headers",
      type: "string",
      repeat: true,
      hint: 'Applied only when Format is "Metadata". e.g. From, To, Subject.',
    },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/messages/${input.messageId}`, {
      query: {
        format: input.format ?? "full",
        metadataHeaders: input.metadataHeaders,
      },
    });
  },
};

export default getMessage;
