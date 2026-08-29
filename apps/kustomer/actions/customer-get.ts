import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /v1/customers/{id}` — verified against the Core Resources OAS. */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch one customer by its Kustomer ID.",
  params: [{ key: "id", label: "Customer ID", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/customers/${encodeURIComponent(input.id)}`);
  },
};

export default customerGet;
