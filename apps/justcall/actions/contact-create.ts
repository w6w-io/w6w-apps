import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JustCallClient } from "../lib/client.ts";

/**
 * `POST /v2.1/contacts` — verified against `create_contact_v21`'s OpenAPI
 * fragment, 2026-09-05.
 *
 * The vendor's response wraps the created contact in a **one-element array**
 * (`CreateContactResponseDTO.data: ContactResponseDto[]`) rather than a bare
 * object; see `lib/client.ts` for why this action unwraps that for the caller.
 */
interface Input {
  first_name: string;
  contact_number: string;
  last_name?: string;
  email?: string;
  company?: string;
  address?: string;
  extension?: number;
  notes?: string;
  agent_id?: number;
  agent_ids?: string[] | string;
  across_team?: boolean;
  other_numbers?: unknown;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Add a new contact to JustCall's Contacts section.",
  // No idempotency key of any kind is documented for this endpoint — a retry
  // creates a second contact with the same details.
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "contact_number", label: "Phone number", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "extension", label: "Extension", type: "number" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "agent_id",
      label: "Owning agent ID",
      type: "number",
      hint: "Create the contact for one specific agent only.",
    },
    {
      key: "agent_ids",
      label: "Owning agent IDs",
      type: "string",
      hint: "Comma-separated. Create the contact for these specific agents only.",
    },
    {
      key: "across_team",
      label: "Across team",
      type: "boolean",
      hint: "true: create for all agents. false (default): only the account owner.",
    },
    {
      key: "other_numbers",
      label: "Other phone numbers",
      type: "json",
      hint: 'Array of {"label": "Mobile", "number": "19876543210"} objects.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "contact_number", type: "string", label: "Primary phone number" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.dataOne("/contacts", {
      method: "POST",
      body: compact({
        first_name: input.first_name,
        contact_number: input.contact_number,
        last_name: input.last_name,
        email: input.email,
        company: input.company,
        address: input.address,
        extension: input.extension,
        notes: input.notes,
        agent_id: input.agent_id,
        agent_ids: input.agent_ids
          ? (Array.isArray(input.agent_ids) ? input.agent_ids : input.agent_ids.split(","))
          : undefined,
        across_team: input.across_team,
        other_numbers: asOptionalJson(input.other_numbers, "other_numbers"),
      }),
    });
  },
};

export default contactCreate;
