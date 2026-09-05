import type { ActionDefinition } from "@w6w/types";
import { WorkableClient } from "../lib/client.ts";

interface Input {
  shortcode: string;
}

/**
 * `GET /jobs/:shortcode/stages` and the account-wide `GET /stages` return the
 * identical shape (verified against both endpoints' documented examples) —
 * this app exposes the job-scoped form since a workflow moving a candidate
 * (`candidate-move`) needs the stages configured on that specific job's
 * pipeline, which can differ between jobs.
 */
const jobStageList: ActionDefinition<Input> = {
  key: "job-stage-list",
  type: "read",
  resource: "job",
  title: "List Job Pipeline Stages",
  description:
    "List the pipeline stages configured on one job — the values `candidate-move`'s Target " +
    "Stage and `candidate-create`'s Stage accept. Required scope: `r_jobs`.",
  params: [
    { key: "shortcode", label: "Job shortcode", type: "string", required: true },
  ],
  output: [
    { key: "stages", type: "array", label: "Stages" },
  ],

  async execute(input, ctx) {
    const body = await new WorkableClient(ctx).json<{ stages?: unknown[] }>(
      `/jobs/${encodeURIComponent(input.shortcode)}/stages`,
    );
    return { stages: body?.stages ?? [] };
  },
};

export default jobStageList;
