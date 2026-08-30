import type { ActionDefinition } from "@w6w/types";
import { compact, PAGE_INFO, PRODUCT_FIELDS, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  isSold?: boolean;
  isBought?: boolean;
  isArchived?: boolean;
  page?: number;
  pageSize?: number;
}

const QUERY = `
  query ListProducts(
    $businessId: ID!
    $page: Int
    $pageSize: Int
    $isSold: Boolean
    $isBought: Boolean
    $isArchived: Boolean
  ) {
    business(id: $businessId) {
      id
      products(
        page: $page
        pageSize: $pageSize
        isSold: $isSold
        isBought: $isBought
        isArchived: $isArchived
      ) {
        ${PAGE_INFO}
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }
  }
`;

const productList: ActionDefinition<Input> = {
  key: "product-list",
  type: "search",
  resource: "product",
  title: "List Products",
  description: "List products/services for a business.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "isSold", label: "Sold (income) only", type: "boolean" },
    { key: "isBought", label: "Bought (expense) only", type: "boolean" },
    { key: "isArchived", label: "Archived only", type: "boolean", advanced: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
  ],
  output: [
    { key: "edges", type: "array", label: "Products, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(
      QUERY,
      compact({
        businessId: input.businessId,
        page: input.page,
        pageSize: input.pageSize,
        isSold: input.isSold,
        isBought: input.isBought,
        isArchived: input.isArchived,
      }),
    );
    return unwrapBusiness(data, "products");
  },
};

export default productList;
