import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  includeDeleted?: boolean;
}

/**
 * Lookup action: an Opportunity's `milestone` is required at create time, and
 * every milestone belongs to a pipeline, so a workflow needs a pipeline id
 * before it can resolve a milestone id (`milestone-list`).
 */
const pipelineList: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "read",
  resource: "pipeline",
  title: "List Pipelines",
  description: "List the sales pipelines on the Capsule account.",
  params: [
    { key: "includeDeleted", label: "Include archived", type: "boolean", advanced: true },
    ...pageParams,
  ],
  output: [
    { key: "pipelines", type: "array", label: "Pipelines" },
    { key: "nextPage", type: "number", label: "Next page" },
  ],

  async execute(input, ctx) {
    const { data, nextPage } = await new CapsuleClient(ctx).request<{ pipelines: unknown[] }>(
      "/pipelines",
      { query: { includeDeleted: input.includeDeleted, ...pageQuery(input) } },
    );
    return { pipelines: data.pipelines, nextPage };
  },
};

export default pipelineList;
