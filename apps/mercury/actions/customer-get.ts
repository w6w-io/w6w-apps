import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/** `GET /ar/customers/{customerId}` — a single AR customer by ID. */
interface Input {
  customerId: string;
}

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single accounts-receivable customer by ID.",
  params: [customerIdParam],
  output: [{ key: "customer", type: "object", label: "Customer" }],

  async execute(input, ctx) {
    const customer = await new MercuryClient(ctx).json(
      `/ar/customers/${encodeURIComponent(input.customerId)}`,
    );
    return { customer };
  },
};

export default customerGet;
