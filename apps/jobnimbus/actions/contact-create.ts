import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  first_name?: string;
  last_name?: string;
  company?: string;
  display_name?: string;
  email?: string;
  mobile_phone?: string;
  address_line1?: string;
  city?: string;
  state_text?: string;
  zip?: string;
  record_type_name: string;
  status_name: string;
  source_name?: string;
  description?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `POST /contacts`.
 *
 * JobNimbus's own note: at least one of First Name, Last Name, Display Name
 * or Company Name is required, and `record_type_name` (a workflow name) plus
 * `status_name` (a status within that workflow) are both required — both are
 * customer-defined names configured in the account's own Contact workflow
 * settings, not a fixed enum this app can validate against.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a new JobNimbus contact.",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "display_name", label: "Display name", type: "string", advanced: true },
    {
      key: "record_type_name",
      label: "Record type (workflow)",
      type: "string",
      required: true,
      hint: 'A contact workflow name defined in this account\'s settings, e.g. "Customer".',
    },
    {
      key: "status_name",
      label: "Status",
      type: "string",
      required: true,
      hint: 'A status defined within the chosen workflow, e.g. "Lead".',
    },
    { key: "source_name", label: "Lead source", type: "string", advanced: true },
    { key: "email", label: "Email", type: "string" },
    { key: "mobile_phone", label: "Mobile phone", type: "string" },
    { key: "address_line1", label: "Address", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state_text", label: "State", type: "string", advanced: true },
    { key: "zip", label: "ZIP", type: "string", advanced: true },
    { key: "description", label: "Description", type: "text", advanced: true },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Any other JobNimbus contact fields, including custom fields (cf_string_1, ...), " +
        "merged into the request body verbatim. Overrides the fields above on key collision.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "record_type_name", type: "string", label: "Record type (workflow)" },
    { key: "status_name", type: "string", label: "Status" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { actor, extra, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single("/contacts", {
      method: "POST",
      body,
      query: { actor },
    });
  },
};

export default contactCreate;
