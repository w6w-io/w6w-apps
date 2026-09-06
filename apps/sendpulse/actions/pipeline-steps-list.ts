import type { ActionDefinition } from "@w6w/types";
import { SendPulseClient } from "../lib/client.ts";

interface Input {
  pipelineId: number;
}

/** `GET /crm/v1/pipelines/{pipelineId}/steps` — a pipeline's stages, in order. */
const action: ActionDefinition<Input> = {
  key: "pipeline-steps-list",
  type: "search",
  resource: "pipeline",
  title: "List pipeline steps",
  description: "List a pipeline's steps (stages), for use as `deal-create`'s `stepId`.",
  params: [
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "number",
      required: true,
      hint: "From `pipelines-list`.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Steps" },
  ],

  async execute(input, ctx) {
    return await new SendPulseClient(ctx).crm(`/pipelines/${input.pipelineId}/steps`);
  },
};

export default action;
