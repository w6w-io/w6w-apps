import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";

/**
 * `GET /v1/api/customers/{customerId}` — full customer detail: policies,
 * notes, tasks and files.
 */
interface Input {
  customerId: number;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a customer's full detail, including policies, notes, tasks and files.",
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Customer ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "totalPremium", type: "number", label: "Total premium of policies, in cents" },
    { key: "policies", type: "array", label: "Policies" },
    { key: "notes", type: "array", label: "Notes" },
    { key: "tasks", type: "array", label: "Tasks" },
  ],

  execute(input, ctx) {
    return new AgencyZoomClient(ctx).get(`/customers/${input.customerId}`);
  },
};

export default customerGet;
