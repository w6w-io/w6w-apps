import type { ActionDefinition } from "@w6w/types";
import { compact, MoneybirdClient, resolveAdministrationId } from "../lib/client.ts";
import {
  administrationIdParam,
  contactBody,
  type ContactFieldInput,
  contactFieldParams,
} from "../lib/params.ts";

interface Input extends ContactFieldInput {
  administrationId?: string;
}

/**
 * `POST /:administration_id/contacts.json`.
 *
 * Moneybird requires a non-blank `company_name`, or a `firstname` and
 * `lastname` — that validation happens server-side (a 422 names the offending
 * field), rather than being duplicated here as a required-param rule, since
 * either combination is valid and a `required` flag can't express "one of
 * these two groups".
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact (customer or supplier) in an administration.",
  // Moneybird mints a new contact id per call with no request key for dedup.
  idempotent: false,
  params: [administrationIdParam, ...contactFieldParams()],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "customer_id", type: "string", label: "Customer ID" },
  ],

  execute(input, ctx) {
    const administrationId = resolveAdministrationId(ctx, input.administrationId);
    return new MoneybirdClient(ctx, administrationId).request("/contacts", {
      method: "POST",
      body: { contact: compact(contactBody(input)) },
    });
  },
};

export default contactCreate;
