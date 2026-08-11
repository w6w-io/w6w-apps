import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `GET /api/v4/posts/{post_id}/thread` — a post and every reply to it.
 *
 * Takes any post in the thread, root or reply, and returns the whole thread in
 * the same `{order, posts}` envelope as the channel listing.
 */
interface Input {
  postId: string;
  perPage?: number;
  fromPost?: string;
  fromCreateAt?: number;
  direction?: string;
}

const postThread: ActionDefinition<Input> = {
  key: "post-thread",
  type: "read",
  resource: "post",
  title: "Get Post Thread",
  description: "Fetch a post and all of its replies. Accepts any post in the thread.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "string",
      required: true,
      hint: "Any post in the thread — the root or one of its replies.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Number of replies per page.",
    },
    {
      key: "fromPost",
      label: "From post ID",
      type: "string",
      hint: "Page from this post within the thread.",
    },
    {
      key: "fromCreateAt",
      label: "From timestamp (ms)",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: [
        { value: "up", label: "Up — older replies" },
        { value: "down", label: "Down — newer replies" },
      ],
    },
  ],
  output: [
    { key: "order", type: "array", label: "Post ids in display order" },
    { key: "posts", type: "object", label: "Posts keyed by id" },
  ],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/posts/${encodeURIComponent(input.postId)}/thread`,
      {
        query: {
          perPage: input.perPage,
          fromPost: input.fromPost,
          fromCreateAt: input.fromCreateAt,
          direction: input.direction,
        },
      },
    );
  },
};

export default postThread;
