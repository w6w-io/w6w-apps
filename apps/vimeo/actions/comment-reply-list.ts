import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import { fieldsParam, paginationParams, videoIdParam } from "../lib/params.ts";

/**
 * `GET /videos/{video_id}/comments/{comment_id}/replies` — replies to a comment.
 *
 * Replies are a separate collection from the comment list, so `comment-list`
 * returns only top-level comments and this returns one comment's thread. Note
 * that this endpoint documents `page` and `per_page` but **no** `direction` —
 * unlike the parent comment list — so no sort parameter is offered.
 */
interface Input {
  videoId: string;
  commentId: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const commentReplyList: ActionDefinition<Input, VimeoCollection> = {
  key: "comment-reply-list",
  type: "search",
  resource: "comment",
  title: "List Comment Replies",
  description: "List the replies to a comment on a video.",
  params: [
    videoIdParam,
    { key: "commentId", label: "Comment ID", type: "string", required: true, placeholder: "12345" },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Replies" },
    { key: "total", type: "number", label: "Total replies" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments/${
        idFromRef(input.commentId, "Comment ID")
      }/replies`,
      { query: { page: input.page, per_page: input.perPage, fields: toCsv(input.fields) } },
    );
  },
};

export default commentReplyList;
