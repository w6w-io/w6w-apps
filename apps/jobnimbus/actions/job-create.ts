import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  name: string;
  primary_contact_jnid?: string;
  record_type_name: string;
  status_name: string;
  source_name?: string;
  address_line1?: string;
  city?: string;
  state_text?: string;
  zip?: string;
  description?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `POST /jobs`.
 *
 * `record_type_name` (a workflow name, e.g. "Job") and `status_name` (a
 * status within that workflow, e.g. "Lead") are both required and are
 * customer-defined names configured in the account's own Job workflow
 * settings. JobNimbus's own example links a job to a contact via
 * `"primary": {"id": "<jnid>"}`; this action exposes that as a plain
 * `primary_contact_jnid` string and builds the nested shape.
 */
const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description: "Create a new JobNimbus job.",
  idempotent: false,
  params: [
    { key: "name", label: "Job name", type: "string", required: true },
    {
      key: "primary_contact_jnid",
      label: "Primary contact jnid",
      type: "string",
      hint: "Links this job to an existing contact, e.g. from Contact List or Create Contact.",
    },
    {
      key: "record_type_name",
      label: "Record type (workflow)",
      type: "string",
      required: true,
      hint: 'A job workflow name defined in this account\'s settings, e.g. "Job".',
    },
    {
      key: "status_name",
      label: "Status",
      type: "string",
      required: true,
      hint: 'A status defined within the chosen workflow, e.g. "Lead".',
    },
    { key: "source_name", label: "Lead source", type: "string", advanced: true },
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
    { key: "name", type: "string", label: "Job name" },
    { key: "record_type_name", type: "string", label: "Record type (workflow)" },
    { key: "status_name", type: "string", label: "Status" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { actor, extra, primary_contact_jnid, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(primary_contact_jnid ? { primary: { id: primary_contact_jnid } } : {}),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single("/jobs", {
      method: "POST",
      body,
      query: { actor },
    });
  },
};

export default jobCreate;
