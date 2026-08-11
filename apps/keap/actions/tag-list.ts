import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/tags` — List Tags.
 *
 * `category_id==NONE` is a documented sentinel, not an id: it selects the tags
 * that belong to no category. Passing an empty string instead removes the
 * clause entirely and returns everything.
 */
interface Input {
  name?: string;
  categoryId?: string;
  tagIds?: string;
  filter?: string;
  orderBy?: string;
  pageSize?: number;
  pageToken?: string;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  title: "List Tags",
  resource: "tag",
  description: "Search the account's tags by name, description, category or id.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Trailing `*` matches a prefix." },
    {
      key: "categoryId",
      label: "Category ID",
      type: "string",
      hint: "Use `NONE` to list only tags in no category.",
    },
    {
      key: "tagIds",
      label: "Tag IDs",
      type: "string",
      placeholder: "1,2,3",
      hint: "Comma-separated list of tag ids to fetch in one call.",
    },
    filterParam,
    orderByParam("One of `name`, `create_time`, `update_time`, plus `asc` or `desc`."),
    ...pageParams(),
  ],
  output: [
    { key: "tags", type: "array", label: "Tags" },
    { key: "count", type: "number", label: "Tags returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("name", input.name),
      eq("category_id", input.categoryId),
      eq("tag_ids", input.tagIds),
      input.filter,
    ]);
    const client = new KeapClient(ctx);
    const body = await client.json<{ tags?: unknown[]; next_page_token?: string }>(`${V2}/tags`, {
      query: {
        filter,
        order_by: input.orderBy,
        page_size: input.pageSize,
        page_token: input.pageToken,
      },
    });
    const tags = body?.tags ?? [];
    return { tags, count: tags.length, nextPageToken: nextPageToken(body) };
  },
};

export default tagList;
