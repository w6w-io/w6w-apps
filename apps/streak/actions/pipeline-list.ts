import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";

/** `GET /pipelines` — every pipeline this key can see, as a bare JSON array. */
interface Input {
  sortBy?: string;
}

const pipelineList: ActionDefinition<Input> = {
  key: "pipeline-list",
  type: "search",
  resource: "pipeline",
  title: "List Pipelines",
  description: "List every pipeline this connection can see.",
  params: [
    {
      key: "sortBy",
      label: "Sort By",
      type: "select",
      options: [
        { value: "creationTimestamp", label: "Creation date" },
        { value: "lastUpdatedTimestamp", label: "Last updated" },
      ],
      advanced: true,
      hint: "Both orders are descending (newest first). Omit for Streak's default order.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Pipelines" }],

  async execute(input, ctx) {
    const results = await new StreakClient(ctx).get<unknown[]>("/pipelines", {
      sortBy: input.sortBy,
    });
    return { results: results ?? [] };
  },
};

export default pipelineList;
