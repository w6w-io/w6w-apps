import type { ActionDefinition } from "@w6w/types";
import { CloudConvertClient } from "../lib/client.ts";
import { jobIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/jobs/{id}` — delete a job, including all its tasks and data.
 *
 * Jobs are deleted automatically 24 hours after they end, so this is for cleaning up
 * early. `idempotent: true`: the end state (job gone) is the same no matter how many
 * times this is called, and CloudConvert answers an empty `204` either way.
 */
interface Input {
  jobId: string;
}

const jobDelete: ActionDefinition<Input> = {
  key: "job-delete",
  type: "perform",
  resource: "job",
  title: "Delete Job",
  description: "Delete a job, including all its tasks and data.",
  idempotent: true,
  params: [jobIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    ctx.log("info", "deleting CloudConvert job", { jobId: input.jobId });
    const status = await new CloudConvertClient(ctx).status(
      `/jobs/${encodeURIComponent(input.jobId)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 204 };
  },
};

export default jobDelete;
