import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  target: "message" | "file";
  channel: string;
  timestamp?: string;
  fileId?: string;
  fileComment?: string;
}

const starAdd: ActionDefinition<Input> = {
  key: "star-add",
  type: "perform",
  resource: "star",
  title: "Add Star",
  description: "Stars a message or file (stars.add).",
  params: [
    {
      key: "target",
      label: "Target",
      type: "select",
      required: true,
      default: "message",
      options: [
        { value: "message", label: "Message" },
        { value: "file", label: "File" },
      ],
    },
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "timestamp", label: "Message ts", type: "string" },
    { key: "fileId", label: "File ID", type: "string" },
    { key: "fileComment", label: "File comment ID", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = { channel: input.channel };
    if (input.target === "message" && input.timestamp) body.timestamp = input.timestamp;
    if (input.target === "file" && input.fileId) body.file = input.fileId;
    if (input.fileComment) body.file_comment = input.fileComment;
    return client.request("/stars.add", { method: "POST", body });
  },
};

export default starAdd;
