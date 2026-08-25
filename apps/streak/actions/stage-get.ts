import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam, stageKeyParam } from "../lib/params.ts";

/** `GET /pipelines/{pipelineKey}/stages/{stageKey}`. */
interface Input {
  pipelineKey: string;
  stageKey: string;
}

const stageGet: ActionDefinition<Input> = {
  key: "stage-get",
  type: "read",
  resource: "stage",
  title: "Get Stage",
  description: "Fetch one stage's name.",
  params: [pipelineKeyParam, stageKeyParam],
  output: [{ key: "data", type: "object", label: "The stage" }],

  execute(input, ctx) {
    return new StreakClient(ctx).get(
      `/pipelines/${encodeId(input.pipelineKey)}/stages/${encodeId(input.stageKey)}`,
    );
  },
};

export default stageGet;
