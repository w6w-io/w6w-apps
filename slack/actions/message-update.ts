import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  ts: string;
  text?: string;
  blocks?: unknown;
  attachments?: unknown;
  asUser?: boolean;
  linkNames?: boolean;
  parse?: string;
}

const messageUpdate: ActionDefinition<Input> = {
  key: "message-update",
  type: "perform",
  resource: "message",
  title: "Update Message",
  description: "Edits an existing message (chat.update).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    { key: "ts", label: "Message ts", type: "string", required: true },
    { key: "text", label: "Text", type: "text" },
    { key: "blocks", label: "Blocks", type: "json" },
    { key: "attachments", label: "Attachments", type: "json" },
    { key: "asUser", label: "As user", type: "boolean" },
    { key: "linkNames", label: "Link names", type: "boolean" },
    { key: "parse", label: "Parse", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = { channel: input.channel, ts: input.ts };
    if (input.text) body.text = input.text;
    if (input.blocks) body.blocks = input.blocks;
    if (input.attachments) body.attachments = input.attachments;
    if (input.asUser !== undefined) body.as_user = input.asUser;
    if (input.linkNames !== undefined) body.link_names = input.linkNames;
    if (input.parse) body.parse = input.parse;
    return client.request("/chat.update", { method: "POST", body });
  },
};

export default messageUpdate;
