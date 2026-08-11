import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/photos/{photo_id}/comments` — comments on one photo.
 *
 * Same `Comment` shape as project comments, with `commentable_type: "Photo"`.
 */
interface Input {
  photoId: string;
  page?: number;
  perPage?: number;
}

const photoCommentList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "photo-comment-list",
  type: "search",
  resource: "comment",
  title: "List Photo Comments",
  description: "List the comments left on a photo.",
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(`/photos/${encodeId(input.photoId)}/comments`, {
      query: paginationQuery(input),
    });
  },
};

export default photoCommentList;
