import type { ActionDefinition } from "@w6w/types";
import { compact, CUSTOMER_FIELDS, PAGE_INFO, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  email?: string;
  modifiedAfter?: string;
  modifiedBefore?: string;
  sortKey?: string;
  sortDirection?: "ASC" | "DESC";
  page?: number;
  pageSize?: number;
}

const QUERY = `
  query ListCustomers(
    $businessId: ID!
    $page: Int
    $pageSize: Int
    $sort: [CustomerSort!]
    $email: String
    $modifiedAtAfter: DateTime
    $modifiedAtBefore: DateTime
  ) {
    business(id: $businessId) {
      id
      customers(
        page: $page
        pageSize: $pageSize
        sort: $sort
        email: $email
        modifiedAtAfter: $modifiedAtAfter
        modifiedAtBefore: $modifiedAtBefore
      ) {
        ${PAGE_INFO}
        edges { node { ${CUSTOMER_FIELDS} } }
      }
    }
  }
`;

/**
 * `sort` is `[CustomerSort!]!` — non-null, but the schema declares a default
 * (`[CREATED_AT_DESC]`), so it's safe to omit entirely when the caller hasn't
 * picked one; Wave applies its own default rather than rejecting the request.
 */
function sortList(key: string | undefined, direction: string | undefined) {
  if (!key) return undefined;
  return [`${key}_${direction === "DESC" ? "DESC" : "ASC"}`];
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "List Customers",
  description: "List customers for a business, optionally filtered by email or modified date.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "email", label: "Email equals", type: "string" },
    { key: "modifiedAfter", label: "Modified after", type: "datetime", advanced: true },
    { key: "modifiedBefore", label: "Modified before", type: "datetime", advanced: true },
    {
      key: "sortKey",
      label: "Sort by",
      type: "select",
      options: [
        { value: "NAME", label: "Name" },
        { value: "CREATED_AT", label: "Created at" },
        { value: "MODIFIED_AT", label: "Modified at" },
      ],
      default: "CREATED_AT",
      advanced: true,
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
      default: "DESC",
      advanced: true,
    },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
  ],
  output: [
    { key: "edges", type: "array", label: "Customers, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(
      QUERY,
      compact({
        businessId: input.businessId,
        page: input.page,
        pageSize: input.pageSize,
        email: input.email,
        modifiedAtAfter: input.modifiedAfter,
        modifiedAtBefore: input.modifiedBefore,
        sort: sortList(input.sortKey, input.sortDirection),
      }),
    );
    return unwrapBusiness(data, "customers");
  },
};

export default customerList;
