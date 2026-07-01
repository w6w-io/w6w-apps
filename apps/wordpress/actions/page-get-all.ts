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
  parent?: number;
  menuOrder?: number;
  status?: string;
  perPage?: number;
  page?: number;
}

const pageGetAll: ActionDefinition<Input> = {
  key: "page-get-all",
  type: "read",
  resource: "page",
  title: "List Pages",
  description: "List pages on a single page of results. Set `page` to walk further pages.",
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
    { key: "parent", label: "Parent Page ID", type: "number" },
    { key: "menuOrder", label: "Menu Order", type: "number" },
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
    return client.request("/pages", {
      query: {
        context: input.context,
        orderby: input.orderBy,
        order: input.order,
        search: input.search,
        before: input.before,
        after: input.after,
        author: input.author,
        parent: input.parent,
        menu_order: input.menuOrder,
        status: input.status,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default pageGetAll;
