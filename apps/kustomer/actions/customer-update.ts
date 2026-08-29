import type { ActionDefinition } from "@w6w/types";
import { compact, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  company?: string;
}

/**
 * `PATCH /v1/customers/{id}` — "Update customer attributes" per the Core
 * Resources OAS (`UpdateCustomerAttributesRequest`), a partial merge rather
 * than the full-replace `PUT /v1/customers/{id}`.
 */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Merge new attribute values into an existing customer.",
  // A partial attribute merge is safe to retry with the same input.
  idempotent: true,
  params: [
    { key: "id", label: "Customer ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "company", label: "Company name", type: "string" },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/customers/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: compact({
        name: unset(input.name),
        company: unset(input.company),
        externalId: unset(input.externalId),
        emails: input.email ? [{ email: input.email, type: "home" }] : undefined,
        phones: input.phone ? [{ phone: input.phone, type: "home" }] : undefined,
      }),
    });
  },
};

export default customerUpdate;
