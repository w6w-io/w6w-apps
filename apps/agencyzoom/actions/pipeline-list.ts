import type { ActionDefinition } from "@w6w/types";
import { AgencyZoomClient } from "../lib/client.ts";
import { pipelineTypeOptions } from "../lib/params.ts";

/**
 * `GET /v1/api/pipelines?type=` — the pipelines of one type, id and name only.
 *
 * Use this to populate a "Pipeline" dropdown; use List Pipelines & Stages
 * (`pipeline-stage-list`) when the workflow also needs stage IDs.
 */
interface Input {
  type: "lead" | "service";
}

interface Pipeline {
  id?: number;
  name?: string;
}

const pipelineList: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines",
  description: "List the lead or service pipelines configured for this agency.",
  params: [
    {
      key: "type",
      label: "Pipeline type",
      type: "select",
      required: true,
      options: pipelineTypeOptions,
    },
  ],
  output: [{ key: "pipelines", type: "array", label: "Pipelines (id, name)" }],

  async execute(input, ctx) {
    const pipelines = await new AgencyZoomClient(ctx).get<Pipeline[]>(
      "/pipelines",
      { type: input.type },
    );
    return { pipelines: pipelines ?? [] };
  },
};

export default pipelineList;
