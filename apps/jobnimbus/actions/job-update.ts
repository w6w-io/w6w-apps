import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  name?: string;
  primary_contact_jnid?: string;
  record_type_name?: string;
  status_name?: string;
  address_line1?: string;
  city?: string;
  state_text?: string;
  zip?: string;
  description?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `PUT /jobs/<jnid>`.
 *
 * A partial update: only the fields supplied are sent, and an omitted field
 * is left untouched on the record.
 */
const jobUpdate: ActionDefinition<Input> = {
  key: "job-update",
  type: "perform",
  resource: "job",
  title: "Update Job",
  description: "Update fields on an existing JobNimbus job. Only the fields supplied are " +
    "changed.",
  idempotent: true,
  params: [
    { key: "jnid", label: "Job jnid", type: "string", required: true },
    { key: "name", label: "Job name", type: "string" },
    {
      key: "primary_contact_jnid",
      label: "Primary contact jnid",
      type: "string",
      advanced: true,
    },
    { key: "record_type_name", label: "Record type (workflow)", type: "string", advanced: true },
    { key: "status_name", label: "Status", type: "string" },
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
      hint: "Any other JobNimbus job fields, including custom fields, merged into the request " +
        "body verbatim. Overrides the fields above on key collision.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "date_updated", type: "number", label: "Updated (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { jnid, actor, extra, primary_contact_jnid, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(primary_contact_jnid ? { primary: { id: primary_contact_jnid } } : {}),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single(`/jobs/${encodeId(jnid)}`, {
      method: "PUT",
      body,
      query: { actor },
    });
  },
};

export default jobUpdate;
