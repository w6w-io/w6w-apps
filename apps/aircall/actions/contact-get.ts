import type { ActionDefinition } from "@w6w/types";
import { AircallClient, encodeId } from "../lib/client.ts";
import { contactIdParam } from "../lib/params.ts";

interface Input {
  contactId: string;
}

/**
 * `GET /v1/contacts/:id` — one shared Contact with its phone numbers and emails.
 *
 * "Only shared contacts can be found", so a 404 here does not prove the Contact
 * does not exist — it may be personal, or synced from an integration and
 * therefore invisible to the Public API.
 *
 * `created_at` and `updated_at` on a Contact are **UNIX timestamps**, unlike the
 * ISO 8601 strings a User or Team carries. Both shapes appear in this API and
 * the resource decides which.
 */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Retrieve Contact",
  description: "Fetch one shared Contact by ID, with its phone numbers and emails.",
  params: [contactIdParam],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company_name", type: "string", label: "Company" },
    { key: "information", type: "string", label: "Free-text field, often an external ID" },
    { key: "phone_numbers", type: "array", label: "{id, label, value} entries" },
    { key: "emails", type: "array", label: "{id, label, value} entries" },
    { key: "created_at", type: "number", label: "UNIX timestamp — not ISO 8601" },
  ],

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    return await client.entity(`/contacts/${encodeId(input.contactId)}`, "contact");
  },
};

export default contactGet;
