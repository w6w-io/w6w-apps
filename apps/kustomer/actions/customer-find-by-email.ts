import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  email: string;
}

/** `GET /v1/customers/email={email}` — verified against the Core Resources OAS. */
const customerFindByEmail: ActionDefinition<Input> = {
  key: "customer-find-by-email",
  type: "read",
  resource: "customer",
  title: "Find Customer by Email",
  description: "Look up a customer by one of their email addresses.",
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(
      `/customers/email=${encodeURIComponent(input.email)}`,
    );
  },
};

export default customerFindByEmail;
