import type { ActionDefinition } from "@w6w/types";
import { compact, MattermostClient, toList } from "../lib/client.ts";

/**
 * `PUT /api/v4/posts/{post_id}/patch` — edit a post.
 *
 * ## `/patch`, not the bare `PUT`
 *
 * Mattermost has both `PUT /api/v4/posts/{post_id}` and
 * `PUT /api/v4/posts/{post_id}/patch`. The first **replaces** the post and
 * expects a whole post object; the second applies only the fields present. This
 * action uses `/patch` so that editing a message cannot silently blank the
 * post's files or props — the classic way an "update" action destroys data it
 * was never asked to touch.
 *
 * Idempotent: re-sending the same patch converges on the same post.
 */
interface Input {
  postId: string;
  message?: string;
  isPinned?: boolean;
  fileIds?: string[] | string;
}

const postUpdate: ActionDefinition<Input> = {
  key: "post-update",
  type: "perform",
  resource: "post",
  title: "Update Post",
  description:
    "Edit a post's message, pin state or attachments. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "postId", label: "Post ID", type: "string", required: true },
    { key: "message", label: "Message", type: "text", hint: "Markdown is supported." },
    {
      key: "isPinned",
      label: "Pinned",
      type: "boolean",
      hint: "Pin or unpin the post in its channel.",
    },
    {
      key: "fileIds",
      label: "File IDs",
      type: "string",
      hint: "Comma-separated. Replaces the post's attachment list; leave empty to keep it as is.",
    },
  ],
  output: [{ key: "id", type: "string", label: "The updated post's id" }],

  execute(input, ctx) {
    return new MattermostClient(ctx).request(
      `/api/v4/posts/${encodeURIComponent(input.postId)}/patch`,
      {
        method: "PUT",
        body: compact({
          message: input.message,
          // `false` survives `compact` on purpose: it is how a post is unpinned.
          is_pinned: input.isPinned,
          file_ids: toList(input.fileIds),
        }),
      },
    );
  },
};

export default postUpdate;
