import type { ActionDefinition } from "@w6w/types";
import { compact, CUSTOMER_FIELDS, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  customerId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const MUTATION = `
  mutation PatchCustomer($input: CustomerPatchInput!) {
    customerPatch(input: $input) {
      didSucceed
      inputErrors { code message path }
      customer { ${CUSTOMER_FIELDS} }
    }
  }
`;

const customerEdit: ActionDefinition<Input> = {
  key: "customer-edit",
  type: "perform",
  resource: "customer",
  title: "Edit Customer",
  description: "Update specific fields of an existing customer. Unset fields are left unchanged.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "firstName", label: "First name", type: "string", row: "name2" },
    { key: "lastName", label: "Last name", type: "string", row: "name2" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],
  output: [{ key: "customer", type: "object", label: "The updated customer" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        id: input.customerId,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
      }),
    });

    return unwrap(data, "customerPatch");
  },
};

export default customerEdit;
