import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient, type BaseSearchResponse, compact } from "../lib/client.ts";
import { pageParams } from "../lib/params.ts";

/**
 * `POST /v1/api/customers` — search customers.
 *
 * `startDate`/`endDate` filter by customer creation date, documented as ISO
 * 8601 (`YYYY-MM-DD`) — see `lib/client.ts` on date formats varying by
 * endpoint. AgencyZoom's own page size ceiling here is 100, half of the 500
 * `pageSize` maximum documented on lead search.
 */
interface Input {
  state?: string;
  city?: string;
  email?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
  leadSourceId?: number;
  firstname?: string;
  lastname?: string;
  fullName?: string;
  policyNumber?: string;
  agentId?: number;
  status?: number;
  page?: number;
  pageSize?: number;
}

interface CustomerSummary {
  id?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
}

interface CustomerSearchResponse extends BaseSearchResponse {
  customers?: CustomerSummary[];
}

const customerList: ActionDefinition<Input> = {
  key: "customer-list",
  type: "search",
  resource: "customer",
  title: "Search Customers",
  description: "Search customers by name, contact info, location, source or policy number.",
  params: [
    { key: "firstname", label: "First name (prefix match)", type: "string" },
    { key: "lastname", label: "Last name (prefix match)", type: "string" },
    { key: "fullName", label: "Full name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State (2-letter)", type: "string" },
    { key: "leadSourceId", label: "Lead source ID", type: "number" },
    { key: "agentId", label: "Agent ID", type: "number" },
    { key: "policyNumber", label: "Policy number", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Active" },
        { value: 0, label: "Inactive" },
        { value: -1, label: "All (default)" },
      ],
    },
    { key: "startDate", label: "Created on/after", type: "string", hint: "YYYY-MM-DD." },
    { key: "endDate", label: "Created on/before", type: "string", hint: "YYYY-MM-DD." },
    ...pageParams(100),
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
    { key: "totalCount", type: "number", label: "Total matching customers" },
    { key: "page", type: "number", label: "Page returned" },
    { key: "pageSize", type: "number", label: "Page size" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).post<CustomerSearchResponse>(
      "/customers",
      compact({ ...input }),
    );
  },
};

export default customerList;
