import type { ActionDefinition } from "@w6w/types";
import { compact, LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

/**
 * `POST /v1/contacts` — create a Contact.
 *
 * The vendor's own sample body also accepts a nested `notes: [{name, body}]`
 * array created inline; that's left out here in favor of the dedicated
 * `create-note` action (`notable_type: "Contact"`), which composes with any
 * record type instead of duplicating the shape once per resource.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new Contact.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First Name", type: "string", required: true },
    { key: "lastName", label: "Last Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Contact attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>("/contacts", {
      method: "POST",
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone: input.phone,
      }),
    });
    return res.data;
  },
};

export default createContact;
