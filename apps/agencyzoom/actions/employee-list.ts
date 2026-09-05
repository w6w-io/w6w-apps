import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/employees` — every employee in this agency, for finding a
 * producer/agent ID (`assignTo`) or CSR ID to assign leads and tasks to.
 *
 * This is also the credential health probe (`auth/login.ts`) — it is the
 * cheapest authenticated read the API exposes.
 */
interface Employee {
  id?: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  phone?: string;
  isProducer?: boolean;
  isActive?: boolean;
  isOwner?: boolean;
  userId?: number;
}

const employeeList: ActionDefinition<Record<string, never>> = {
  key: "employee-list",
  type: "read",
  resource: "employee",
  title: "List Employees",
  description: "List every employee in this agency.",
  params: [],
  output: [{ key: "employees", type: "array", label: "Employees" }],

  async execute(_input, ctx) {
    const employees = await new AgencyZoomClient(ctx).get<Employee[]>("/employees");
    return { employees: employees ?? [] };
  },
};

export default employeeList;
