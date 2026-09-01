import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/** `GET /v1/customers/{id}` — a customer's full details. */
interface Input {
  id: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a specific customer's full details.",
  params: [customerIdParam()],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contact", type: "string", label: "Phone" },
    { key: "email", type: "string", label: "Email" },
    { key: "gstin", type: "string", label: "GSTIN" },
    { key: "created_at", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/customers/${encodeURIComponent(input.id)}`);
  },
};

export default customerGet;
