import type { ActionDefinition } from "@w6w/types";
import { ACCOUNT_FIELDS, compact, PAGE_INFO, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  types?: string; // comma-separated AccountTypeValue
  subtypes?: string; // comma-separated AccountSubtypeValue
  isArchived?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * The chart of accounts. Mainly useful as reference data: `product-create`
 * needs an `incomeAccountId`/`expenseAccountId`, and `money-transaction-create`
 * needs an anchor account plus one or more categorization accounts. Wave's own
 * "Mutation: Create product/service" doc recommends exactly this query,
 * filtered by `types: [INCOME]`, to find a valid income account.
 */
const QUERY = `
  query ListAccounts(
    $businessId: ID!
    $page: Int
    $pageSize: Int
    $types: [AccountTypeValue!]
    $subtypes: [AccountSubtypeValue!]
    $isArchived: Boolean
  ) {
    business(id: $businessId) {
      id
      accounts(
        page: $page
        pageSize: $pageSize
        types: $types
        subtypes: $subtypes
        isArchived: $isArchived
      ) {
        ${PAGE_INFO}
        edges { node { ${ACCOUNT_FIELDS} } }
      }
    }
  }
`;

const csvList = (v: string | undefined) => v?.split(",").map((s) => s.trim()).filter(Boolean);

const accountList: ActionDefinition<Input> = {
  key: "account-list",
  type: "search",
  resource: "account",
  title: "List Accounts",
  description: "List the chart of accounts for a business, optionally filtered by type/subtype.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    {
      key: "types",
      label: "Account types",
      type: "string",
      hint: "Comma-separated: ASSET, EQUITY, EXPENSE, INCOME, LIABILITY.",
    },
    {
      key: "subtypes",
      label: "Account subtypes",
      type: "string",
      hint: "Comma-separated subtype values, e.g. INCOME, CASH_AND_BANK, EXPENSE.",
      advanced: true,
    },
    { key: "isArchived", label: "Archived only", type: "boolean", advanced: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
  ],
  output: [
    { key: "edges", type: "array", label: "Accounts, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(
      QUERY,
      compact({
        businessId: input.businessId,
        page: input.page,
        pageSize: input.pageSize,
        types: csvList(input.types),
        subtypes: csvList(input.subtypes),
        isArchived: input.isArchived,
      }),
    );
    return unwrapBusiness(data, "accounts");
  },
};

export default accountList;
