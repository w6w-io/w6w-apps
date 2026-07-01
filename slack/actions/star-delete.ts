import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel?: string;
  timestamp?: string;
  fileId?: string;
  fileComment?: string;
}

const starDelete: ActionDefinition<Input> = {
  key: "star-delete",
  type: "perform",
  resource: "star",
  title: "Delete Star",
  description: "Removes a star from a message or file (stars.remove).",
  params: [
    { key: "channel", label: "Channel ID", type: "string" },
    { key: "timestamp", label: "Message ts", type: "string" },
    { key: "fileId", label: "File ID", type: "string" },
    { key: "fileComment", label: "File comment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.channel) body.channel = input.channel;
    if (input.timestamp) body.timestamp = input.timestamp;
    if (input.fileId) body.file = input.fileId;
    if (input.fileComment) body.file_comment = input.fileComment;
    return client.request("/stars.remove", { method: "POST", body });
  },
};

export default starDelete;
