import type { ActionDefinition } from "@w6w/types";
import { FormidableClient } from "../lib/client.ts";

interface Input {
  page?: number;
  pageSize?: number;
  order?: "ASC" | "DESC";
  orderBy?: string;
  formId?: string | number;
}

/**
 * `GET /frm/v3/views` — list Views. Requires the Formidable Views add-on and
 * the "Add/Edit Views" permission. Query parameters match the reference:
 * `page`, `page_size`, `order`, `order_by`, `form_id`.
 */
const viewGetMany: ActionDefinition<Input> = {
  key: "view-get-many",
  type: "search",
  resource: "view",
  title: "Get Many Views",
  description: "List Views on the site, optionally scoped to one form.",
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
    { key: "formId", label: "Form ID", type: "string", hint: "Sent as `form_id`." },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    return client.request("/views", {
      query: {
        page: input.page,
        page_size: input.pageSize,
        order: input.order,
        order_by: input.orderBy,
        form_id: input.formId,
      },
    });
  },
};

export default viewGetMany;
