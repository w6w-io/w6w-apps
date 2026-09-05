import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
  order?: "ASC" | "DESC";
  orderBy?: string;
  search?: string;
}

/**
 * `GET /frm/v3/styles` — list styles. Query parameters match the ones the
 * reference names for this route: `page`, `page_size`, `order`, `order_by`,
 * `search`. Requires "Access this Settings Page".
 */
const styleGetMany: ActionDefinition<Input> = {
  key: "style-get-many",
  type: "search",
  resource: "style",
  title: "Get Many Styles",
  description: "List the styles defined on the site.",
  params: [
    { key: "page", label: "Page", type: "number" },
    { key: "pageSize", label: "Page Size", type: "number", hint: "`page_size`." },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "orderBy", label: "Order By", type: "string", hint: "`order_by`." },
    { key: "search", label: "Search", type: "string" },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request("/styles", {
      query: {
        page: input.page,
        page_size: input.pageSize,
        order: input.order,
        order_by: input.orderBy,
        search: input.search,
      },
    });
  },
};

export default styleGetMany;
