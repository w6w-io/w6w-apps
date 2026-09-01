import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  mobile_phone?: string;
  address_line1?: string;
  city?: string;
  state_text?: string;
  zip?: string;
  record_type_name?: string;
  status_name?: string;
  description?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `PUT /contacts/<jnid>`.
 *
 * JobNimbus's own PUT is a partial update: JobNimbus's example only sends
 * the fields being changed, so every field here is optional and only the
 * ones supplied are sent — an omitted field is left untouched on the record
 * rather than cleared.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update fields on an existing JobNimbus contact. Only the fields supplied are " +
    "changed.",
  idempotent: true,
  params: [
    {
      key: "jnid",
      label: "Contact jnid",
      type: "string",
      required: true,
    },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "record_type_name", label: "Record type (workflow)", type: "string", advanced: true },
    { key: "status_name", label: "Status", type: "string" },
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
      hint: "Any other JobNimbus contact fields, including custom fields, merged into the " +
        "request body verbatim. Overrides the fields above on key collision.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "date_updated", type: "number", label: "Updated (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { jnid, actor, extra, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single(`/contacts/${encodeId(jnid)}`, {
      method: "PUT",
      body,
      query: { actor },
    });
  },
};

export default contactUpdate;
