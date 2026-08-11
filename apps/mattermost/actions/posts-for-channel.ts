import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `GET /api/v4/channels/{channel_id}/posts` — a channel's posts.
 *
 * ## The response is not an array, and iterating it wrong loses the order
 *
 * Mattermost returns `{order, posts, next_post_id, prev_post_id, has_next}`:
 * `posts` is a **map keyed by post id** and `order` is the array of ids in
 * display order. `Object.values(posts)` gives you the posts in whatever order
 * the JSON happened to serialise — which is the single most common way to
 * misread this API. The envelope is returned whole so `order` survives.
 *
 * ## `since`, `before` and `after` are three different cursors
 *
 * `since` is a **millisecond timestamp** and returns everything changed after
 * it — including edits to old posts, which is what makes it the right choice for
 * a polling sync. `before`/`after` take a **post id** and page relative to it.
 * Mixing them is a 400.
 */
interface Input {
  channelId: string;
  page?: number;
  perPage?: number;
  since?: number;
  before?: string;
  after?: string;
  includeDeleted?: boolean;
}

const postsForChannel: ActionDefinition<Input> = {
  key: "posts-for-channel",
  type: "search",
  resource: "post",
  title: "List Channel Posts",
  description:
    "List a channel's posts. Returns Mattermost's `{order, posts}` envelope — read `order` for " +
    "the display order.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 0 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 200 },
      hint: "Default 60, maximum 200.",
    },
    {
      key: "since",
      label: "Since (ms timestamp)",
      type: "number",
      validation: { integer: true, min: 0 },
      hint:
        "Everything created *or edited* after this Unix millisecond timestamp — the right cursor " +
        "for a polling sync. Cannot be combined with Before/After.",
    },
    {
      key: "before",
      label: "Before post ID",
      type: "string",
      hint: "Page backwards from this post. A post id, not a timestamp.",
    },
    {
      key: "after",
      label: "After post ID",
      type: "string",
      hint: "Page forwards from this post. A post id, not a timestamp.",
    },
    { key: "includeDeleted", label: "Include deleted", type: "boolean" },
  ],
  output: [
    { key: "order", type: "array", label: "Post ids in display order — read this, not `posts`" },
    { key: "posts", type: "object", label: "Posts keyed by id" },
    { key: "next_post_id", type: "string", label: "Cursor for the next page" },
    { key: "prev_post_id", type: "string", label: "Cursor for the previous page" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/channels/${encodeURIComponent(input.channelId)}/posts`,
      {
        query: {
          page: input.page,
          per_page: input.perPage,
          since: input.since,
          before: input.before,
          after: input.after,
          include_deleted: input.includeDeleted,
        },
      },
    );
  },
};

export default postsForChannel;
