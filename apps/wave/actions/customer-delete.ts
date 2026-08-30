import type { ActionDefinition } from "@w6w/types";
import { unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  customerId: string;
}

const MUTATION = `
  mutation DeleteCustomer($input: CustomerDeleteInput!) {
    customerDelete(input: $input) {
      didSucceed
      inputErrors { code message path }
    }
  }
`;

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Permanently delete a customer. Wave rejects this with an `inputErrors` entry if the customer has existing invoices, estimates or transactions.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
  ],
  output: [{ key: "didSucceed", type: "boolean", label: "Whether the delete succeeded" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: { id: input.customerId },
    });

    return unwrap(data, "customerDelete");
  },
};

export default customerDelete;
