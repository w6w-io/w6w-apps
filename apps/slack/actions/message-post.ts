import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  channel: string;
  text?: string;
  blocks?: unknown;
  attachments?: unknown;
  threadTs?: string;
  replyBroadcast?: boolean;
  ephemeralUser?: string;
  asUser?: boolean;
  linkNames?: boolean;
  mrkdwn?: boolean;
  unfurlLinks?: boolean;
  unfurlMedia?: boolean;
  parse?: string;
  iconUrl?: string;
  iconEmoji?: string;
  username?: string;
}

const messagePost: ActionDefinition<Input> = {
  key: "message-post",
  type: "perform",
  resource: "message",
  title: "Post Message",
  description:
    "Sends a message to a channel, DM or user. Switches to chat.postEphemeral when `ephemeralUser` is set.",
  params: [
    {
      key: "channel",
      label: "Channel or User",
      type: "string",
      required: true,
      hint: "Channel ID (C…), DM ID (D…), user ID (U…), or `@handle`.",
    },
    { key: "text", label: "Text", type: "text" },
    {
      key: "blocks",
      label: "Blocks",
      type: "json",
      hint: "Slack Block Kit array. Overrides / supplements text.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint: "Legacy Slack attachment array.",
    },
    {
      key: "threadTs",
      label: "Thread ts",
      type: "string",
      hint: "Reply into an existing thread by providing the parent `ts`.",
    },
    { key: "replyBroadcast", label: "Broadcast reply", type: "boolean" },
    {
      key: "ephemeralUser",
      label: "Ephemeral user",
      type: "string",
      hint: "If set, calls chat.postEphemeral and shows the message only to this user.",
    },
    { key: "asUser", label: "As user", type: "boolean" },
    { key: "linkNames", label: "Link names", type: "boolean" },
    { key: "mrkdwn", label: "Markdown", type: "boolean" },
    { key: "unfurlLinks", label: "Unfurl links", type: "boolean" },
    { key: "unfurlMedia", label: "Unfurl media", type: "boolean" },
    { key: "parse", label: "Parse", type: "string" },
    { key: "iconUrl", label: "Icon URL", type: "string" },
    { key: "iconEmoji", label: "Icon emoji", type: "string" },
    { key: "username", label: "Username", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const body: Record<string, unknown> = { channel: input.channel };
    if (input.text) body.text = input.text;
    if (input.blocks) body.blocks = input.blocks;
    if (input.attachments) body.attachments = input.attachments;
    if (input.threadTs) body.thread_ts = input.threadTs;
    if (input.replyBroadcast !== undefined) body.reply_broadcast = input.replyBroadcast;
    if (input.asUser !== undefined) body.as_user = input.asUser;
    if (input.linkNames !== undefined) body.link_names = input.linkNames;
    if (input.mrkdwn !== undefined) body.mrkdwn = input.mrkdwn;
    if (input.unfurlLinks !== undefined) body.unfurl_links = input.unfurlLinks;
    if (input.unfurlMedia !== undefined) body.unfurl_media = input.unfurlMedia;
    if (input.parse) body.parse = input.parse;
    if (input.iconUrl) body.icon_url = input.iconUrl;
    if (input.iconEmoji) body.icon_emoji = input.iconEmoji;
    if (input.username) body.username = input.username;

    const endpoint = input.ephemeralUser ? "/chat.postEphemeral" : "/chat.postMessage";
    if (input.ephemeralUser) body.user = input.ephemeralUser;

    return client.request(endpoint, { method: "POST", body });
  },
};

export default messagePost;
