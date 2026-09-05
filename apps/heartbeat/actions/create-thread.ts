import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";
import { RICH_TEXT_HINT } from "../lib/params.ts";

/** `PUT /v0/threads` — post a new thread in a POSTS channel. */
interface Input {
  channelID: string;
  text: string;
  userID?: string;
  embeds?: string[] | string;
  createdAt?: string;
}

const createThread: ActionDefinition<Input> = {
  key: "create-thread",
  type: "perform",
  resource: "thread",
  title: "Create Thread",
  description: "Post a new thread in a channel.",
  idempotent: false,
  params: [
    { key: "channelID", label: "Channel ID", type: "string", required: true },
    { key: "text", label: "Content", type: "text", required: true, hint: RICH_TEXT_HINT },
    {
      key: "userID",
      label: "Author user ID",
      type: "string",
      hint: "Must be an admin. Defaults to the user who created the API key.",
    },
    {
      key: "embeds",
      label: "HTML embeds",
      type: "multiselect",
      hint: "Each entry must be an <iframe> embed code (e.g. a Spotify/video player).",
    },
    {
      key: "createdAt",
      label: "Created at (override)",
      type: "datetime",
      hint: "ISO 8601. Overrides the default creation timestamp.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Thread ID" },
    { key: "channelID", type: "string", label: "Channel ID" },
    { key: "userID", type: "string", label: "Author user ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "url", type: "string", label: "URL to this thread" },
  ],

  execute(input, ctx) {
    const embeds = Array.isArray(input.embeds)
      ? input.embeds
      : input.embeds
      ? input.embeds.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return new HeartbeatClient(ctx).json("/threads", {
      method: "PUT",
      body: compact({
        text: input.text,
        channelID: input.channelID,
        userID: input.userID,
        embeds,
        createdAt: input.createdAt,
      }),
    });
  },
};

export default createThread;
