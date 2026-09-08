import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  include?: string;
}

/** `GET /customers/{id}` — verified against developers.booqable.com ("Fetch a customer"). */
const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Fetch a single customer by id.",
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { ...includeParam, placeholder: "barcode,payment_methods,properties,tax_region" },
  ],
  output: [{ key: "data", type: "object", label: "The Customer object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/customers/${input.customerId}`, {
      query: { include: input.include },
    });
  },
};

export default customerGet;
