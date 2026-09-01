import type { ActionDefinition } from "@w6w/types";
import { encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  actor?: string;
}

/**
 * `PUT /jobs/<jnid>` `{"is_active": false}`.
 *
 * As with contacts, JobNimbus's "delete" is a soft delete: the job is
 * deactivated, not removed, and can be reactivated through Update Job.
 */
const jobDelete: ActionDefinition<Input> = {
  key: "job-delete",
  type: "perform",
  resource: "job",
  title: "Delete Job",
  description: 'Deactivate a JobNimbus job (JobNimbus\'s own "delete": the record is flagged ' +
    "inactive, not removed).",
  idempotent: true,
  params: [
    { key: "jnid", label: "Job jnid", type: "string", required: true },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "is_active", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).deactivate(`/jobs/${encodeId(input.jnid)}`, {
      actor: input.actor,
    });
  },
};

export default jobDelete;
