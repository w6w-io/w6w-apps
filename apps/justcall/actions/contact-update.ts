import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JustCallClient } from "../lib/client.ts";

/**
 * `PUT /v2.1/contacts` — verified against `update_contact_v21`'s OpenAPI
 * fragment, 2026-09-05.
 *
 * The id is a **body** field, not a path parameter — unlike `call-update` and
 * `contact-get`, this endpoint's path is the bare `/contacts` collection. Send
 * `id` to target one contact by id, or `contact_number` (with `across_team`) to
 * target by number instead — the vendor documents "If contact_number is sent
 * but id is not" as the alternate addressing form.
 */
interface Input {
  id?: number;
  contact_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  address?: string;
  extension?: number;
  across_team?: boolean;
  notes?: unknown;
  other_numbers?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update an existing contact, addressed by id or by contact_number.",
  // A retry resends the same field values, which JustCall applies as the same
  // replacement — safe to repeat.
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number" },
    {
      key: "contact_number",
      label: "Contact number",
      type: "string",
      hint: "Primary phone number. Used to address the contact when id is not sent.",
    },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "extension", label: "Extension", type: "number" },
    {
      key: "across_team",
      label: "Across team",
      type: "boolean",
      hint: "true: update for all agents. false (default): only the account owner.",
    },
    {
      key: "notes",
      label: "Notes to add",
      type: "json",
      hint: 'Array of {"note": "text"} objects, appended to the contact.',
    },
    {
      key: "other_numbers",
      label: "Other phone numbers",
      type: "json",
      hint: 'Replaces the existing set. Array of {"label": "Mobile", "number": "..."} objects.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Full name" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.dataOne("/contacts", {
      method: "PUT",
      body: compact({
        id: input.id,
        contact_number: input.contact_number,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        company: input.company,
        address: input.address,
        extension: input.extension,
        across_team: input.across_team,
        notes: asOptionalJson(input.notes, "notes"),
        other_numbers: asOptionalJson(input.other_numbers, "other_numbers"),
      }),
    });
  },
};

export default contactUpdate;
