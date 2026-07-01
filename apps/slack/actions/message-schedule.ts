import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  postAt: string;
  text?: string;
  blocks?: unknown;
  attachments?: unknown;
  threadTs?: string;
  replyBroadcast?: boolean;
  asUser?: boolean;
  linkNames?: boolean;
  parse?: string;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
}

const messageSchedule: ActionDefinition<Input> = {
  key: "message-schedule",
  type: "perform",
  resource: "message",
  title: "Schedule Message",
  description: "Schedules a message for future delivery (chat.scheduleMessage).",
  params: [
    { key: "channel", label: "Channel ID", type: "string", required: true },
    {
      key: "postAt",
      label: "Post at",
      type: "datetime",
      required: true,
      hint: "ISO datetime — converted to a Unix timestamp when sent.",
    },
    { key: "text", label: "Text", type: "text" },
    { key: "blocks", label: "Blocks", type: "json" },
    { key: "attachments", label: "Attachments", type: "json" },
    { key: "threadTs", label: "Thread ts", type: "string" },
    { key: "replyBroadcast", label: "Broadcast reply", type: "boolean" },
    { key: "asUser", label: "As user", type: "boolean" },
    { key: "linkNames", label: "Link names", type: "boolean" },
    { key: "parse", label: "Parse", type: "string" },
    { key: "unfurlLinks", label: "Unfurl links", type: "boolean" },
    { key: "unfurlMedia", label: "Unfurl media", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = {
      channel: input.channel,
      post_at: Math.floor(new Date(input.postAt).getTime() / 1000),
    };
    if (input.text) body.text = input.text;
    if (input.blocks) body.blocks = input.blocks;
    if (input.attachments) body.attachments = input.attachments;
    if (input.threadTs) body.thread_ts = input.threadTs;
    if (input.replyBroadcast !== undefined) body.reply_broadcast = input.replyBroadcast;
    if (input.asUser !== undefined) body.as_user = input.asUser;
    if (input.linkNames !== undefined) body.link_names = input.linkNames;
    if (input.parse) body.parse = input.parse;
    if (input.unfurlLinks !== undefined) body.unfurl_links = input.unfurlLinks;
    if (input.unfurlMedia !== undefined) body.unfurl_media = input.unfurlMedia;
    return client.request("/chat.scheduleMessage", { method: "POST", body });
  },
};

export default messageSchedule;
