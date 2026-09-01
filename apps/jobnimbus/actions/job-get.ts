import type { ActionDefinition } from "@w6w/types";
import { encodeId, JobNimbusClient } from "../lib/client.ts";
import { ACTOR_PARAM } from "../lib/params.ts";

interface Input {
  jnid: string;
  actor?: string;
}

/** `GET /jobs/<jnid>` — the record itself, no envelope. */
const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Fetch a single JobNimbus job by its jnid.",
  params: [
    {
      key: "jnid",
      label: "Job jnid",
      type: "string",
      required: true,
      hint: "JobNimbus's internal id for the record, e.g. from a Job List result.",
    },
    ACTOR_PARAM,
  ],
  output: [
    { key: "jnid", type: "string", label: "jnid" },
    { key: "name", type: "string", label: "Job name" },
    { key: "primary", type: "object", label: "Primary contact" },
    { key: "record_type_name", type: "string", label: "Record type (workflow)" },
    { key: "status_name", type: "string", label: "Status" },
    { key: "is_active", type: "boolean", label: "Active" },
    { key: "date_created", type: "number", label: "Created (Unix timestamp)" },
    { key: "date_updated", type: "number", label: "Updated (Unix timestamp)" },
  ],

  async execute(input, ctx) {
    return await new JobNimbusClient(ctx).single(`/jobs/${encodeId(input.jnid)}`, {
      query: { actor: input.actor },
    });
  },
};

export default jobGet;
