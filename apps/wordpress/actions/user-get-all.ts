import type { ActionDefinition } from "@w6w/types";
import { WordPressClient } from "../lib/client.ts";

interface Input {
  context?: "view" | "embed" | "edit";
  orderBy?: string;
  order?: "asc" | "desc";
  search?: string;
  who?: string;
  perPage?: number;
  page?: number;
}

const userGetAll: ActionDefinition<Input> = {
  key: "user-get-all",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List users on a single page of results. Set `page` to walk further pages.",
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
    { key: "orderBy", label: "Order By", type: "string", default: "name" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "ASC" },
        { value: "desc", label: "DESC" },
      ],
      default: "asc",
    },
    { key: "search", label: "Search", type: "string" },
    {
      key: "who",
      label: "Who",
      type: "select",
      options: [{ value: "authors", label: "Authors" }],
      hint: "Restrict to users capable of authoring posts.",
    },
    { key: "perPage", label: "Per Page", type: "number", default: 10 },
    { key: "page", label: "Page", type: "number", default: 1 },
  ],

  async execute(input, ctx) {
    const client = WordPressClient.fromConnection(ctx);
    return client.request("/users", {
      query: {
        context: input.context,
        orderby: input.orderBy,
        order: input.order,
        search: input.search,
        who: input.who,
        per_page: input.perPage ?? 10,
        page: input.page ?? 1,
      },
    });
  },
};

export default userGetAll;
