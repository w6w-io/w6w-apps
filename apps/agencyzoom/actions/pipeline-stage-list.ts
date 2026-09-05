import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";
import { pipelineTypeOptions } from "../lib/params.ts";

/**
 * `GET /v1/api/pipelines-and-stages?type=` — pipelines with their stages
 * nested, unlike `pipeline-list` which returns id/name only.
 *
 * A lead's `stageId` (used by `lead-create`/`lead-update`/`lead-change-status`)
 * only makes sense within its own `pipelineId` — this is the one call that
 * gives both together.
 */
interface Input {
  type?: "lead" | "service";
}

interface WorkflowStage {
  id?: number;
  name?: string;
  seq?: number;
  status?: number;
}

interface Workflow {
  id?: number;
  name?: string;
  type?: string;
  seq?: number;
  status?: number;
  stages?: WorkflowStage[];
}

const pipelineStageList: ActionDefinition<Input> = {
  key: "pipeline-stage-list",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines & Stages",
  description: "List pipelines with their stages nested, for finding a stage ID within its " +
    "pipeline.",
  params: [
    {
      key: "type",
      label: "Pipeline type",
      type: "select",
      options: pipelineTypeOptions,
      hint: "Leave blank for every pipeline of every type.",
    },
  ],
  output: [{ key: "pipelines", type: "array", label: "Pipelines with nested stages" }],

  async execute(input, ctx) {
    const pipelines = await new AgencyZoomClient(ctx).get<Workflow[]>(
      "/pipelines-and-stages",
      { type: input.type },
    );
    return { pipelines: pipelines ?? [] };
  },
};

export default pipelineStageList;
