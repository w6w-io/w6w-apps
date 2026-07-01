import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  context?: "view" | "embed" | "edit";
  orderBy?: string;
  order?: "asc" | "desc";
  search?: string;
  before?: string;
  after?: string;
  author?: number[];
  categories?: number[];
  excludedCategories?: number[];
  tags?: number[];
  excludedTags?: number[];
  sticky?: boolean;
  status?: string;
  perPage?: number;
  page?: number;
}

const postGetAll: ActionDefinition<Input> = {
  key: "post-get-all",
  type: "read",
  resource: "post",
  title: "List Posts",
  description: "List posts on a single page. Set `page` to walk further pages.",
  params: [
    {
      key: "context",
      label: "Context",
      type: "select",
      options: [
        { value: "view", label: "View" },
        { value: "embed", label: "Embed" },
        { value: "edit", label: "Edit" },
      ],
    },
    { key: "orderBy", label: "Order By", type: "string", default: "date" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "ASC" },
        { value: "desc", label: "DESC" },
      ],
      default: "desc",
    },
    { key: "search", label: "Search", type: "string" },
    { key: "after", label: "After (ISO8601)", type: "datetime" },
    { key: "before", label: "Before (ISO8601)", type: "datetime" },
    { key: "author", label: "Author IDs", type: "multiselect" },
    { key: "categories", label: "Category IDs", type: "multiselect" },
    { key: "excludedCategories", label: "Excluded Category IDs", type: "multiselect" },
    { key: "tags", label: "Tag IDs", type: "multiselect" },
    { key: "excludedTags", label: "Excluded Tag IDs", type: "multiselect" },
    { key: "sticky", label: "Sticky", type: "boolean" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "draft", label: "Draft" },
        { value: "future", label: "Future" },
        { value: "pending", label: "Pending" },
        { value: "private", label: "Private" },
        { value: "publish", label: "Publish" },
      ],
    },
    { key: "perPage", label: "Per Page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request("/posts", {
      query: {
        context: input.context,
        orderby: input.orderBy,
        order: input.order,
        search: input.search,
        before: input.before,
        after: input.after,
        author: input.author,
        categories: input.categories,
        categories_exclude: input.excludedCategories,
        tags: input.tags,
        tags_exclude: input.excludedTags,
        sticky: input.sticky,
        status: input.status,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default postGetAll;
