import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import { directionOptions, fieldsParam, paginationParams, videoIdParam } from "../lib/params.ts";

/**
 * `GET /videos/{video_id}/comments` — the comments on a video.
 *
 * Vimeo calls these "video comments" throughout, to distinguish them from the
 * time-coded review notes on a review page, which are a separate feature this
 * app does not touch.
 *
 * A comment carries both `text` (plain) and `richtext` (a stringified ProseMirror
 * document). Both are returned; see `comment-create` for which to send.
 *
 * Only top-level comments come back here. Replies hang off each comment and are
 * read with `comment-reply-list`.
 */
interface Input {
  videoId: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const commentList: ActionDefinition<Input, VimeoCollection> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Video Comments",
  description: "List the top-level comments on a video.",
  params: [
    videoIdParam,
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Comments" },
    { key: "total", type: "number", label: "Total comments" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection(
      `/videos/${idFromRef(input.videoId, "Video ID")}/comments`,
      {
        query: {
          direction: input.direction,
          page: input.page,
          per_page: input.perPage,
          fields: toCsv(input.fields),
        },
      },
    );
  },
};

export default commentList;
