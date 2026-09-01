import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  note: string;
  related_jnid?: string;
  record_type_name?: string;
  extra?: unknown;
  actor?: string;
}

/**
 * `POST /activities`.
 *
 * The common case — logging a note on a contact or job — is JobNimbus's own
 * example: `{"note", "record_type_name": "Note", "primary": {"id": "<jnid>"}}`.
 * `related_jnid` here maps to that `primary` field.
 */
const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity (Note)",
  description: "Log a note or other activity on a JobNimbus contact or job.",
  idempotent: false,
  params: [
    { key: "note", label: "Note", type: "text", required: true },
    {
      key: "related_jnid",
      label: "Related contact/job jnid",
      type: "string",
      hint: "The contact or job this activity is logged against, e.g. from Contact List or " +
        "Job List.",
    },
    {
      key: "record_type_name",
      label: "Record type",
      type: "string",
      default: "Note",
      advanced: true,
      hint: 'An activity type defined in this account\'s settings. Defaults to "Note".',
    },
    {
      key: "extra",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: "Any other JobNimbus activity fields, merged into the request body verbatim. " +
        "Overrides the fields above on key collision.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "note", type: "string", label: "Note" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    const { actor, extra, related_jnid, ...fields } = input;
    const body = {
      ...compact(fields as Record<string, unknown>),
      ...(related_jnid ? { primary: { id: related_jnid } } : {}),
      ...(asOptionalJson<Record<string, unknown>>(extra, "extra") ?? {}),
    };
    return await new JobNimbusClient(ctx).single("/activities", {
      method: "POST",
      body,
      query: { actor },
    });
  },
};

export default activityCreate;
