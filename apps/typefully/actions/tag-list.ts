import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { paginationParams, socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  limit?: number;
  offset?: number;
}

/** `GET /v2/social-sets/{social_set_id}/tags` — a social set's tags. */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List tags defined on a social set. Use their slugs to tag or filter drafts.",
  params: [socialSetIdParam, ...paginationParams(10, 50)],
  output: [
    { key: "results", type: "array", label: "Tags" },
    { key: "count", type: "number", label: "Total available" },
    { key: "limit", type: "number", label: "Page size used" },
    { key: "offset", type: "number", label: "Offset used" },
    { key: "next", type: "string", label: "Next page URL, or null" },
    { key: "previous", type: "string", label: "Previous page URL, or null" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/tags`, {
      query: { limit: input.limit, offset: input.offset },
    });
  },
};

export default tagList;
