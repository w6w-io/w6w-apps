import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  draftId: string;
  format?: "minimal" | "full" | "raw" | "metadata";
}

/**
 * Fetch a single draft. `format` mirrors the same enum as
 * `users.messages.get` since a draft wraps a message.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/get
 */
const getDraft: ActionDefinition<Input> = {
  key: "get-draft",
  type: "read",
  resource: "draft",
  title: "Get Draft",
  description: "Retrieve a single Gmail draft by ID.",
  params: [
    { key: "draftId", label: "Draft ID", type: "string", required: true },
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
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/drafts/${input.draftId}`, {
      query: { format: input.format ?? "full" },
    });
  },
};

export default getDraft;
