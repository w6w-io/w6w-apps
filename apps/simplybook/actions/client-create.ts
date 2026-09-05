import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  name: string;
  email?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  zip?: string;
  countryId?: string;
  stateId?: number;
}

/**
 * `POST /admin/clients` — create a client. `address1`/`address2`/`city`/
 * `zip`/`countryId`/`stateId` are documented as belonging to the "Client
 * login" custom feature and are nullable — harmless to send when that
 * feature is off, but they will not surface anywhere in the UI.
 */
const clientCreate: ActionDefinition<Input> = {
  key: "client-create",
  type: "perform",
  resource: "client",
  title: "Create Client",
  description: "Create a new client (POST /admin/clients).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, row: "id" },
    { key: "email", label: "Email", type: "string", row: "id" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "address1", label: "Address line 1", type: "string", advanced: true },
    { key: "address2", label: "Address line 2", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "zip", label: "ZIP / postal code", type: "string", advanced: true },
    {
      key: "countryId",
      label: "Country ID",
      type: "string",
      advanced: true,
      hint: "GET /public/countries lists valid country ids.",
    },
    { key: "stateId", label: "State ID", type: "number", advanced: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    const body: Record<string, unknown> = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      address1: input.address1,
      address2: input.address2,
      city: input.city,
      zip: input.zip,
      country_id: input.countryId,
      state_id: input.stateId,
    };
    return client.request("/admin/clients", { method: "POST", body });
  },
};

export default clientCreate;
