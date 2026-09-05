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
 * `GET /frm/v3/forms` — list forms.
 *
 * Query parameters are exactly the ones the reference names for this route:
 * `page`, `page_size`, `order`, `order_by`, `search`. Permission: "View Forms List".
 */
const formGetMany: ActionDefinition<Input> = {
  key: "form-get-many",
  type: "search",
  resource: "form",
  title: "Get Many Forms",
  description: "List forms on the site, with paging, ordering and search.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "1-based. Defaults to page 1." },
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
  // The reference documents no example response body for this route — see the
  // app's index.ts doc comment on why `output` is left undeclared throughout.

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request("/forms", {
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

export default formGetMany;
