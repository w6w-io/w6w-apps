import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  pipelineId: number;
}

/**
 * Uses `GET /pipelines/{pipelineId}/milestones`, not the legacy
 * `GET /milestones` — Capsule's own docs mark the pipeline-less endpoint as
 * "the collection of all the milestones on the OLDEST ACTIVE pipeline...
 * remains for backwards compatibility purposes", i.e. on any account with
 * more than one pipeline it silently omits every other pipeline's
 * milestones. That single-sentence caveat is easy to miss and would have
 * cost a workflow author real time debugging "why doesn't my milestone id
 * show up" on an account with multiple pipelines.
 */
const milestoneList: ActionDefinition<Input> = {
  key: "milestone-list",
  type: "read",
  resource: "pipeline",
  title: "List Milestones",
  description: "List the milestones (pipeline stages) on a specific pipeline.",
  params: [
    { key: "pipelineId", label: "Pipeline ID", type: "number", required: true },
    ...pageParams,
  ],
  output: [
    { key: "milestones", type: "array", label: "Milestones" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<{ milestones: unknown[] }>(
      `/pipelines/${input.pipelineId}/milestones`,
      { query: pageQuery(input) },
    );
    return { milestones: data.milestones, nextPage };
  },
};

export default milestoneList;
