import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";
import { organizationIdParam, paginationParams } from "../lib/params.ts";

/**
 * `GET /tags` — every tag in the account. `limit`/`offset` per the vendor's
 * own example (`?limit=0&offset=0&title`); a `title` filter is also accepted
 * (present as an empty query key in that same example, implying a
 * substring/exact filter, though the vendor's collection does not show a
 * non-empty value). `limit=0` in the vendor's own example returns an
 * unbounded page, so a positive default is used here instead to avoid a
 * first call returning the whole account's tag list unbounded.
 */
interface Input {
  limit?: number;
  offset?: number;
  title?: string;
  organizationId?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List Tags",
  description: "List all tags in the account.",
  params: [
    ...paginationParams(50),
    { key: "title", label: "Title filter", type: "string" },
    organizationIdParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total tag count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).list("/tags", {
      query: { limit: input.limit, offset: input.offset, title: input.title },
      organizationId: input.organizationId,
    });
  },
};

export default tagList;
