import type { ActionDefinition } from "@w6w/types";
import { crmCreate } from "../lib/crm.ts";

interface Input {
  email?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
  website?: string;
  lifecyclestage?: string;
  additionalProperties?: Record<string, unknown>;
}

const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new contact. `email` is not required by HubSpot but is strongly recommended.",
  params: [
    { key: "email", label: "Email", type: "string" },
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
    return crmCreate(ctx, "contacts", {
      properties: {
        email: input.email,
        firstname: input.firstname,
        lastname: input.lastname,
        phone: input.phone,
        company: input.company,
        website: input.website,
        lifecyclestage: input.lifecyclestage,
        ...(input.additionalProperties ?? {}),
      },
    });
  },
};

export default createContact;
