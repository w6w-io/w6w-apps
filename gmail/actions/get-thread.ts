import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  threadId: string;
  format?: "minimal" | "full" | "metadata";
  metadataHeaders?: string[];
}

/**
 * Fetch a thread including all its messages.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.threads/get
 */
const getThread: ActionDefinition<Input> = {
  key: "get-thread",
  type: "read",
  resource: "thread",
  title: "Get Thread",
  description: "Retrieve a single Gmail thread by ID.",
  params: [
    { key: "threadId", label: "Thread ID", type: "string", required: true },
    {
      key: "format",
      label: "Format",
      type: "select",
      default: "full",
      options: [
        { value: "minimal", label: "Minimal" },
        { value: "full", label: "Full" },
        { value: "metadata", label: "Metadata" },
      ],
    },
    {
      key: "metadataHeaders",
      label: "Metadata Headers",
      type: "string",
      repeat: true,
    },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request(`/users/me/threads/${input.threadId}`, {
      query: {
        format: input.format ?? "full",
        metadataHeaders: input.metadataHeaders,
      },
    });
  },
};

export default getThread;
