import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/photos/{photo_id}/tags` — the tags on one photo.
 *
 * Rows are the same `Tag` shape as `tag-list` and as project labels:
 * `display_value` for people, `value` (lowercased) for matching.
 */
interface Input {
  photoId: string;
  page?: number;
  perPage?: number;
}

const photoTagList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "photo-tag-list",
  type: "search",
  resource: "tag",
  title: "List Photo Tags",
  description: "List the tags applied to a photo.",
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(`/photos/${encodeId(input.photoId)}/tags`, {
      query: paginationQuery(input),
    });
  },
};

export default photoTagList;
