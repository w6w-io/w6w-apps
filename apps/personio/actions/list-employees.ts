import type { ActionDefinition } from "@w6w/types";
import { compact, flattenAttributes, requestJson } from "../lib/client.ts";

/**
 * `GET /company/employees` — paginated by `limit`/`offset` (default 10/0), optionally
 * filtered by `email` or a projection of `attributes[]`.
 *
 * **`updated_since` changes the contract of every other filter.** Personio's own
 * reference states this explicitly: when `updated_since` is set, `email`, `limit` and
 * `offset` are silently IGNORED and the response returns every employee updated since
 * that timestamp with no pagination at all. `attributes[]` combined with `updated_since`
 * switches meaning too — it stops being a projection and becomes a second filter ("only
 * employees that had one of these attributes change"). This action passes `updatedSince`
 * straight through and documents the trade rather than trying to paper over it.
 */
interface Input {
  limit?: number;
  offset?: number;
  email?: string;
  attributes?: string[];
  updatedSince?: string;
}

interface EmployeeResource {
  attributes?: Record<string, { value?: unknown }>;
}

interface EmployeesResponse {
  success?: boolean;
  metadata?: { total_elements?: number; current_page?: number; total_pages?: number };
  offset?: number;
  limit?: number;
  data?: EmployeeResource[];
}

const listEmployees: ActionDefinition<Input, unknown> = {
  key: "list-employees",
  type: "read",
  resource: "employee",
  title: "List Employees",
  description: "List company employees, paginated. Filter by email or by an updated-since " +
    "timestamp (which disables pagination — see the field hint).",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 10, row: "page" },
    { key: "offset", label: "Offset", type: "number", default: 0, row: "page" },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Return only the employee with this email. Ignored when Updated Since is set.",
      advanced: true,
    },
    {
      key: "attributes",
      label: "Attributes to return",
      type: "string",
      repeat: true,
      hint: "Project only these fields, e.g. first_name, last_name, email. Leave empty for " +
        "every allowed attribute.",
      advanced: true,
    },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "string",
      placeholder: "2026-01-01T00:00:00 or 2026-01-01",
      hint: "Only employees updated after this time. When set, Limit, Offset and Email are " +
        "ignored by Personio and pagination is disabled.",
      advanced: true,
    },
  ],
  output: [
    { key: "employees", type: "array", label: "Employees (flattened attributes)" },
    { key: "totalElements", type: "number", label: "Total elements" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "currentPage", type: "number", label: "Current page" },
  ],

  async execute(input, ctx) {
    const query = compact({
      limit: input.limit,
      offset: input.offset,
      email: input.email,
      attributes: input.attributes,
      updated_since: input.updatedSince,
    });
    const res = await requestJson<EmployeesResponse>(ctx, "/company/employees", { query });
    const employees = (res.data ?? []).map((e) => flattenAttributes(e.attributes));
    return {
      employees,
      totalElements: res.metadata?.total_elements,
      totalPages: res.metadata?.total_pages,
      currentPage: res.metadata?.current_page,
    };
  },
};

export default listEmployees;
