import type { ActionDefinition } from "@w6w/types";
import { encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  actor?: string;
}

/** `GET /contacts/<jnid>` — the record itself, no envelope. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single JobNimbus contact by its jnid.",
  params: [
    {
      key: "jnid",
      label: "Contact jnid",
      type: "string",
      required: true,
      hint: "JobNimbus's internal id for the record, e.g. from a Contact List result.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "company", type: "string", label: "Company" },
    { key: "email", type: "string", label: "Email" },
    { key: "record_type_name", type: "string", label: "Record type (workflow)" },
    { key: "status_name", type: "string", label: "Status" },
    { key: "is_active", type: "boolean", label: "Active" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
    { key: "date_updated", type: "number", label: "Updated (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).single(`/contacts/${encodeId(input.jnid)}`, {
      query: { actor: input.actor },
    });
  },
};

export default contactGet;
