import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/photos/{photo_id}/comments` — comment on a photo.
 *
 * Body nests as `{"comment": {"content": "…"}}`, and the impersonation header
 * applies, so a workflow can post as the crew member the photo belongs to
 * rather than as the integration.
 *
 * Not idempotent: a retry posts a second comment.
 */
interface Input {
  photoId: string;
  content: string;
  actAs?: string;
}

const photoCommentCreate: ActionDefinition<Input> = {
  key: "photo-comment-create",
  type: "perform",
  resource: "comment",
  title: "Add Photo Comment",
  description: "Post a comment on a photo, optionally credited to another user.",
  idempotent: false,
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    { key: "content", label: "Comment", type: "text", required: true },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "content", type: "string", label: "Content" },
    { key: "creator_name", type: "string", label: "Credited to" },
    { key: "commentable_id", type: "string", label: "Photo ID" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/photos/${encodeId(input.photoId)}/comments`, {
      method: "POST",
      body: { comment: { content: input.content } },
      actAs: input.actAs,
    });
  },
};

export default photoCommentCreate;
