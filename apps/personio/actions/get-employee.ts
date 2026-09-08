import type { ActionDefinition } from "@w6w/types";
import { flattenAttributes, requestJson } from "../lib/client.ts";

/** `GET /company/employees/{employee_id}` — a single employee, attributes flattened. */
interface Input {
  employeeId: number;
}

interface EmployeeResponse {
  data?: { attributes?: Record<string, { value?: unknown }> };
}

const getEmployee: ActionDefinition<Input, unknown> = {
  key: "get-employee",
  type: "read",
  resource: "employee",
  title: "Get Employee",
  description: "Get a single employee by their Personio numeric id.",
  params: [
    { key: "employeeId", label: "Employee ID", type: "number", required: true },
  ],
  output: [
    { key: "employee", type: "object", label: "Employee (flattened attributes)" },
  ],

  async execute(input, ctx) {
    const res = await requestJson<EmployeeResponse>(
      ctx,
      `/company/employees/${encodeURIComponent(String(input.employeeId))}`,
    );
    return { employee: flattenAttributes(res.data?.attributes) };
  },
};

export default getEmployee;
