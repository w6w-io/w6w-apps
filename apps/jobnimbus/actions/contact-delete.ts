import type { ActionDefinition } from "@w6w/types";
import { encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  actor?: string;
}

/**
 * `PUT /contacts/<jnid>` `{"is_active": false}`.
 *
 * JobNimbus's Postman collection titles this "Delete a Contact," but there is
 * no DELETE verb in the API: the record is soft-deleted — deactivated, not
 * removed — and can be reactivated by setting `is_active` back to `true`
 * through Update Contact.
 */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: 'Deactivate a JobNimbus contact (JobNimbus\'s own "delete": the record is ' +
    "flagged inactive, not removed).",
  idempotent: true,
  params: [
    {
      key: "jnid",
      label: "Contact jnid",
      type: "string",
      required: true,
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "is_active", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).deactivate(`/contacts/${encodeId(input.jnid)}`, {
      actor: input.actor,
    });
  },
};

export default contactDelete;
