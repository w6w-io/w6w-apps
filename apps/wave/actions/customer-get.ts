import type { ActionDefinition } from "@w6w/types";
import { CUSTOMER_FIELDS, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  customerId: string;
}

const QUERY = `
  query GetCustomer($businessId: ID!, $customerId: ID!) {
    business(id: $businessId) {
      id
      customer(id: $customerId) {
        ${CUSTOMER_FIELDS}
      }
    }
  }
`;

const customerGet: ActionDefinition<Input> = {
  key: "customer-get",
  type: "read",
  resource: "customer",
  title: "Get Customer",
  description: "Retrieve a single customer by id.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "customerId", label: "Customer ID", type: "string", required: true },
  ],
  output: [{ key: "customer", type: "object", label: "The customer" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(QUERY, {
      businessId: input.businessId,
      customerId: input.customerId,
    });
    return unwrapBusiness(data, "customer");
  },
};

export default customerGet;
