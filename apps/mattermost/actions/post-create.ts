import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MattermostClient, toList } from "../lib/client.ts";

/**
 * `POST /api/v4/posts` — post a message to a channel.
 *
 * The two required fields are `channel_id` and `message`. The channel **id** is
 * required, not its name — use Get Channel by Name to turn "town-square" into
 * one, which is why that action exists.
 *
 * `root_id` is what makes this a threaded reply. Mattermost threads are one
 * level deep: replying to a reply still takes the *root* post's id, so passing a
 * reply's id here silently attaches the message to that reply's thread rather
 * than creating a nested one.
 *
 * `file_ids` is capped at **5 per post** by the server, and the vendor's own
 * guidance is to split across additional posts rather than raising it.
 *
 * Not idempotent: Mattermost has no idempotency key here, and posting twice
 * produces two messages.
 */
interface Input {
  channelId: string;
  message: string;
  rootId?: string;
  fileIds?: string[] | string;
  props?: unknown;
  priority?: string;
}

const postCreate: ActionDefinition<Input> = {
  key: "post-create",
  type: "perform",
  resource: "post",
  title: "Create Post",
  description: "Post a message to a channel, optionally as a reply in a thread.",
  idempotent: false,
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      required: true,
      hint: "The channel's id, not its name — Get Channel by Name resolves a name to one.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      hint: "Markdown is supported.",
    },
    {
      key: "rootId",
      label: "Reply to (root post ID)",
      type: "string",
      hint:
        "Makes this a threaded reply. Threads are one level deep — always pass the *root* post's " +
        "id, not a reply's.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "string",
      hint:
        "Comma-separated ids of files already uploaded to this server. The server caps a post at " +
        "5 files; use additional posts for more.",
    },
    {
      key: "props",
      label: "Props",
      type: "json",
      hint: "A free-form JSON property bag attached to the post — used by integrations and cards.",
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "important", label: "Important" },
        { value: "urgent", label: "Urgent" },
      ],
      hint: "Message priority. Requires a server version and licence that supports it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The created post's id" },
    { key: "create_at", type: "number", label: "Creation timestamp (ms)" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request("/api/v4/posts", {
      method: "POST",
      body: compact({
        channel_id: input.channelId,
        message: input.message,
        root_id: input.rootId,
        file_ids: toList(input.fileIds),
        props: asOptionalJson(input.props, "Props"),
        // The priority block is nested two deep in the vendor's schema:
        // metadata.priority.priority. Sending a bare string is a 400.
        metadata: input.priority ? { priority: { priority: input.priority } } : undefined,
      }),
    });
  },
};

export default postCreate;
