import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `POST /pipelines/{pipelineKey}` — edit a pipeline's name, sharing or
 * stage order. Unlike the PUT create endpoint, this is `application/json`.
 */
interface Input {
  pipelineKey: string;
  name?: string;
  orgWide?: boolean;
  teamKey?: string;
  stageOrder?: string[];
}

const pipelineUpdate: ActionDefinition<Input> = {
  key: "pipeline-update",
  type: "perform",
  resource: "pipeline",
  title: "Update Pipeline",
  description: "Rename a pipeline, change its sharing, or reorder its stages.",
  idempotent: true,
  params: [
    pipelineKeyParam,
    { key: "name", label: "Name", type: "string" },
    { key: "orgWide", label: "Organization-Wide", type: "boolean", advanced: true },
    { key: "teamKey", label: "Team Key", type: "string", advanced: true },
    {
      key: "stageOrder",
      label: "Stage Order",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint: "The full ordered list of stage keys — Get Pipeline returns the current stageOrder.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated pipeline" }],

  execute(input, ctx) {
    const { pipelineKey, ...body } = input;
    return new StreakClient(ctx).sendJson("POST", `/pipelines/${encodeId(pipelineKey)}`, body);
  },
};

export default pipelineUpdate;
