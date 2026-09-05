import type { ActionDefinition } from "@w6w/types";
import { compact, LearnWorldsClient } from "../lib/client.ts";

/**
 * `GET /v2/payments` — the school's payment transactions, newest first,
 * default 50 per page.
 */
interface Input {
  productType?: string;
  userId?: string;
  productId?: string;
  page?: number;
  itemsPerPage?: number;
}

const paymentsList: ActionDefinition<Input> = {
  key: "payments-list",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "List payment transactions, most recently created first.",
  params: [
    {
      key: "productType",
      label: "Product type",
      type: "select",
      options: [
        { label: "Course", value: "course" },
        { label: "Bundle", value: "bundle" },
        { label: "Subscription", value: "subscription" },
      ],
    },
    { key: "userId", label: "User ID or email", type: "string" },
    { key: "productId", label: "Product ID", type: "string" },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "itemsPerPage",
      label: "Items per page",
      type: "number",
      default: 50,
      validation: { min: 1, max: 200 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Payments" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new LearnWorldsClient(ctx).request("/v2/payments", {
      query: compact({
        product_type: input.productType,
        user_id: input.userId,
        product_id: input.productId,
        page: input.page,
        items_per_page: input.itemsPerPage,
      }),
    });
  },
};

export default paymentsList;
