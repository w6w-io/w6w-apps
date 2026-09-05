import type { ActionDefinition } from "@w6w/types";
import { compact, InvoiceNinjaClient, unset } from "../lib/client.ts";
import { clientOutput } from "../lib/params.ts";

interface Input {
  name?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  phone?: string;
  website?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  countryId?: number;
  vatNumber?: string;
  idNumber?: string;
  privateNotes?: string;
  isTaxExempt?: boolean;
}

/**
 * `POST /api/v1/clients` — verified against `ClientRequest`
 * (embedded OpenAPI spec at api-docs.invoicing.co). The vendor's schema marks
 * `contacts` and `country_id` required; this action still collects `country_id`
 * as optional rather than force a numeric ISO country code on every workflow
 * author — Invoice Ninja itself will reject the call with a 422 if the
 * receiving instance truly requires it, surfaced verbatim by
 * `InvoiceNinjaClient`. `contacts` is always sent as a one-element array (blank
 * if no contact fields were given) to satisfy that requirement.
 */
const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Create a client, optionally with its first contact.",
  // Invoice Ninja mints a new hashed id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "name", label: "Client name", type: "string", row: "identity" },
    { key: "phone", label: "Phone", type: "string", row: "identity" },
    { key: "contactFirstName", label: "Contact first name", type: "string", row: "contact" },
    { key: "contactLastName", label: "Contact last name", type: "string", row: "contact" },
    { key: "contactEmail", label: "Contact email", type: "string", row: "contact" },
    { key: "contactPhone", label: "Contact phone", type: "string", advanced: true },
    { key: "website", label: "Website", type: "string", advanced: true },
    { key: "address1", label: "Address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true, row: "geo" },
    { key: "state", label: "State", type: "string", advanced: true, row: "geo" },
    { key: "postalCode", label: "Postal code", type: "string", advanced: true, row: "geo" },
    {
      key: "countryId",
      label: "Country ID",
      type: "number",
      advanced: true,
      hint: "Invoice Ninja's numeric ISO country id (e.g. 840 for the US). Marked required by " +
        "the vendor's own schema for some instances.",
    },
    { key: "vatNumber", label: "VAT number", type: "string", advanced: true },
    { key: "idNumber", label: "ID / tax number", type: "string", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
    { key: "isTaxExempt", label: "Tax exempt", type: "boolean", advanced: true },
  ],
  output: clientOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/clients", {
      method: "POST",
      body: {
        name: unset(input.name),
        phone: unset(input.phone),
        website: unset(input.website),
        address1: unset(input.address1),
        city: unset(input.city),
        state: unset(input.state),
        postal_code: unset(input.postalCode),
        country_id: input.countryId,
        vat_number: unset(input.vatNumber),
        id_number: unset(input.idNumber),
        private_notes: unset(input.privateNotes),
        is_tax_exempt: input.isTaxExempt,
        contacts: [
          compact({
            first_name: unset(input.contactFirstName),
            last_name: unset(input.contactLastName),
            email: unset(input.contactEmail),
            phone: unset(input.contactPhone),
          }),
        ],
      },
    });
  },
};

export default clientCreate;
