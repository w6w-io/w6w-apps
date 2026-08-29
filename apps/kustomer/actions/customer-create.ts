import type { ActionDefinition } from "@w6w/types";
import { compact, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  name?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  company?: string;
}

/**
 * `POST /v1/customers` — verified against `CreateaCustomerRequest` in the
 * Core Resources OAS. The full schema accepts arrays of emails/phones/socials
 * etc. (each an object of `{ email, type }` / `{ phone, type }`); this action
 * exposes the common single-email/single-phone case a workflow needs to file
 * a new customer, rather than modelling every array field.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer record.",
  // Kustomer mints a new customer id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "Your own system's identifier for this customer.",
    },
    { key: "company", label: "Company name", type: "string" },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data("/customers", {
      method: "POST",
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

export default customerCreate;
