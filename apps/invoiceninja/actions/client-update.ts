import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, unset } from "../lib/client.ts";
import { clientOutput } from "../lib/params.ts";

interface Input {
  clientId: string;
  name?: string;
  phone?: string;
  website?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  vatNumber?: string;
  privateNotes?: string;
}

/**
 * `PUT /api/v1/clients/{id}` — verified against `updateClient` and the same
 * `ClientRequest` schema `client-create` uses. Invoice Ninja's REST
 * conventions (shared across every resource in this app) partially update: a
 * field left out of the body is left unchanged, so every field here is
 * optional.
 */
const clientUpdate: ActionDefinition<Input> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update a client. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "name", label: "Client name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "website", label: "Website", type: "string", advanced: true },
    { key: "address1", label: "Address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true, row: "geo" },
    { key: "state", label: "State", type: "string", advanced: true, row: "geo" },
    { key: "postalCode", label: "Postal code", type: "string", advanced: true, row: "geo" },
    { key: "vatNumber", label: "VAT number", type: "string", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: clientOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/clients/${input.clientId}`, {
      method: "PUT",
      body: {
        name: unset(input.name),
        phone: unset(input.phone),
        website: unset(input.website),
        address1: unset(input.address1),
        city: unset(input.city),
        state: unset(input.state),
        postal_code: unset(input.postalCode),
        vat_number: unset(input.vatNumber),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default clientUpdate;
