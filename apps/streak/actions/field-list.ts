import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreakClient } from "../lib/client.ts";
import { pipelineKeyParam } from "../lib/params.ts";

/**
 * `GET /pipelines/{pipelineKey}/fields` — the custom field definitions on a
 * pipeline, as a bare array (unlike `stage-list`'s keyed-by-id object — see
 * `lib/client.ts`).
 */
interface Input {
  pipelineKey: string;
}

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "search",
  resource: "field",
  title: "List Pipeline Fields",
  description: "List every custom field defined on a pipeline.",
  params: [pipelineKeyParam],
  output: [{ key: "results", type: "array", label: "Fields" }],

  async execute(input, ctx) {
    const results = await new StreakClient(ctx).get<unknown[]>(
      `/pipelines/${encodeId(input.pipelineKey)}/fields`,
    );
    return { results: results ?? [] };
  },
};

export default fieldList;
