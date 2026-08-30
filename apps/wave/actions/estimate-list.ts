import type { ActionDefinition } from "@w6w/types";
import { compact, ESTIMATE_FIELDS, PAGE_INFO, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  customerId?: string;
  status?: string;
  estimateNumber?: string;
  page?: number;
  pageSize?: number;
}

/**
 * `estimates(sort: ...)` takes a single `EstimateSort!` value, NOT a list —
 * unlike `customers`/`invoices`/`products`, which all take `[XSort!]!`. This
 * app leaves `sort` unset here and relies on Wave's own schema default
 * (`CREATED_AT_DESC`) rather than risk sending the wrong shape.
 */
const QUERY = `
  query ListEstimates(
    $businessId: ID!
    $page: Int
    $pageSize: Int
    $customerId: ID
    $status: EstimateListStatusFilter
    $estimateNumber: String
  ) {
    business(id: $businessId) {
      id
      estimates(
        page: $page
        pageSize: $pageSize
        customerId: $customerId
        status: $status
        estimateNumber: $estimateNumber
      ) {
        ${PAGE_INFO}
        edges { node { ${ESTIMATE_FIELDS} } }
      }
    }
  }
`;

const estimateList: ActionDefinition<Input> = {
  key: "estimate-list",
  type: "search",
  resource: "estimate",
  title: "List Estimates",
  description: "List estimates for a business, optionally filtered by customer, status or number.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        "ACCEPTED",
        "ACTIVE",
        "APPROVED",
        "CONVERTED",
        "DRAFT",
        "EXPIRED",
        "PAID",
        "PARTIAL",
        "REJECTED",
        "SENT",
        "UNPAID",
        "VIEWED",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "estimateNumber", label: "Estimate number", type: "string", advanced: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 20 },
  ],
  output: [
    { key: "edges", type: "array", label: "Estimates, each wrapped in a `node`" },
    { key: "pageInfo", type: "object", label: "currentPage / totalPages / totalCount" },
  ],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(
      QUERY,
      compact({
        businessId: input.businessId,
        page: input.page,
        pageSize: input.pageSize,
        customerId: input.customerId,
        status: input.status,
        estimateNumber: input.estimateNumber,
      }),
    );
    return unwrapBusiness(data, "estimates");
  },
};

export default estimateList;
