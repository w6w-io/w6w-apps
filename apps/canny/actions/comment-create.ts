import type { ActionDefinition } from "@w6w/types";
import { CannyClient, toList } from "../lib/client.ts";
import { idOutput } from "../lib/output.ts";
import { postIdParam } from "../lib/params.ts";

/**
 * `POST /v1/comments/create` — post a comment on a post's board.
 *
 * Canny's own reference notes the author must already exist as a Canny user
 * — see the Upsert User action.
 */
interface Input {
  authorID: string;
  postID: string;
  value?: string;
  imageURLs?: string[] | string;
  internal?: boolean;
  parentID?: string;
  shouldNotifyVoters?: boolean;
  createdAt?: string;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description:
    "Post a portal comment on behalf of a user. The author must already exist as a Canny user " +
    "— see Upsert User.",
  idempotent: false,
  params: [
    {
      key: "authorID",
      label: "Author",
      type: "string",
      required: true,
      hint: "The comment author's Canny user id.",
    },
    postIdParam,
    {
      key: "value",
      label: "Comment text",
      type: "text",
      hint: "Optional only if imageURLs are provided. Must be under 2,500 characters.",
    },
    { key: "imageURLs", label: "Image URLs", type: "string", repeat: true },
    {
      key: "internal",
      label: "Internal only",
      type: "boolean",
      advanced: true,
      hint: "The author must be a member of the company for this to be allowed.",
    },
    {
      key: "parentID",
      label: "Reply to",
      type: "string",
      advanced: true,
      hint: "The id of the comment this is a reply to.",
    },
    {
      key: "shouldNotifyVoters",
      label: "Notify voters",
      type: "boolean",
      advanced: true,
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "datetime",
      advanced: true,
      hint: "If this comment is being migrated from another source, its original creation time " +
        "(ISO 8601).",
    },
  ],
  output: idOutput,

  execute(input, ctx) {
    return new CannyClient(ctx).post<{ id: string }>("/comments/create", {
      authorID: input.authorID,
      postID: input.postID,
      value: input.value,
      imageURLs: toList(input.imageURLs),
      internal: input.internal,
      parentID: input.parentID,
      shouldNotifyVoters: input.shouldNotifyVoters,
      createdAt: input.createdAt,
    });
  },
};

export default commentCreate;
