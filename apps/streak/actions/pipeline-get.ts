import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/** `GET /pipelines/{pipelineKey}` — one pipeline, including its stages and fields. */
interface Input {
  pipelineKey: string;
}

const pipelineGet: ActionDefinition<Input> = {
  key: "pipeline-get",
  type: "read",
  resource: "pipeline",
  title: "Get Pipeline",
  description: "Fetch one pipeline, including its stages, fields and stage order.",
  params: [pipelineKeyParam],
  output: [{ key: "data", type: "object", label: "The pipeline" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(`/pipelines/${encodeId(input.pipelineKey)}`);
  },
};

export default pipelineGet;
