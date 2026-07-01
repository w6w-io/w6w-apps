import type { ActionDefinition } from "@w6w/types";
import { HubSpotClient, type HubSpotObject } from "../lib/client.ts";
import { coerceProperties } from "../lib/crm.ts";

interface Input {
  email: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  additionalProperties?: Record<string, unknown>;
}

/**
 * Upsert by email — the "create or update" path most CRM syncs want. Uses
 * `PUT /crm/v3/objects/contacts/{email}?idProperty=email` which HubSpot
 * treats as an upsert.
 */
const upsertContact: ActionDefinition<Input, HubSpotObject> = {
  key: "upsert-contact",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description: "Upsert a contact keyed on its email address.",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "website", label: "Website", type: "string" },
    { key: "lifecyclestage", label: "Lifecycle stage", type: "string" },
    {
      key: "additionalProperties",
      label: "Additional properties",
      type: "json",
      hint: "Object of HubSpot property names → values, merged into the payload.",
    },
  ],

  async execute(input, ctx) {
    const client = new HubSpotClient(ctx);
    const properties = coerceProperties({
      email: input.email,
      firstname: input.firstname,
      lastname: input.lastname,
      phone: input.phone,
      company: input.company,
      website: input.website,
      lifecyclestage: input.lifecyclestage,
      ...(input.additionalProperties ?? {}),
    });
    return client.request<HubSpotObject>(
      `/crm/v3/objects/contacts/${encodeURIComponent(input.email)}`,
      {
        method: "PUT",
        query: { idProperty: "email" },
        body: { properties },
      },
    );
  },
};

export default upsertContact;
