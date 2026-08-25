import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `GET /pipelines/{pipelineKey}/stages`.
 *
 * The one list endpoint in this whole API that answers an object **keyed by
 * stage id** (`{"5001": {...}, "5002": {...}}`) rather than an array — every
 * sibling list (`pipeline-list`, `field-list`, `box-list`) answers a bare
 * array instead. This action normalises it to an array so callers get one
 * consistent shape from every `*-list` action in this app; the raw keyed
 * object is available from `pipeline-get`'s own `stages` field if the
 * original mapping matters.
 */
interface Input {
  pipelineKey: string;
}

interface Stage {
  key: string;
  name: string;
}

const stageList: ActionDefinition<Input> = {
  key: "stage-list",
  type: "search",
  resource: "stage",
  title: "List Stages",
  description: "List every stage in a pipeline.",
  params: [pipelineKeyParam],
  output: [{ key: "results", type: "array", label: "Stages" }],

  async execute(input, ctx) {
    const byId = await new StreakClient(ctx).get<Record<string, Stage>>(
      `/pipelines/${encodeId(input.pipelineKey)}/stages`,
    );
    return { results: Object.values(byId ?? {}) };
  },
};

export default stageList;
