import type { ActionDefinition } from "@w6w/types";
import { StreakClient } from "../lib/client.ts";

/**
 * `GET /search?name=<term>` — search boxes by name only.
 *
 * A distinct endpoint from `search` (`?query=`), not the same call with a
 * different field: this one only ever returns `results.boxes`, and its
 * results carry `assignedToKeys`, which `?query=` box results do not. The
 * vendor's own operation id for this endpoint is
 * `searchng-for-boxes-by-name` (their typo, kept here only in this comment
 * for anyone grepping the reference — the action's own key is spelled
 * normally).
 */
interface Input {
  name: string;
  pipelineKey?: string;
  stageKey?: string;
}

interface SearchByNameResponse {
  results?: { boxes?: unknown[] };
}

const boxSearchByName: ActionDefinition<Input> = {
  key: "box-search-by-name",
  type: "search",
  resource: "box",
  title: "Search Boxes By Name",
  description: "Search boxes by name.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "pipelineKey", label: "Pipeline Key", type: "string", advanced: true },
    { key: "stageKey", label: "Stage Key", type: "string", advanced: true },
  ],
  output: [{ key: "results", type: "array", label: "Matching boxes" }],

  async execute(input, ctx) {
    const body = await new StreakClient(ctx).get<SearchByNameResponse>("/search", {
      name: input.name,
      pipelineKey: input.pipelineKey,
      stageKey: input.stageKey,
    });
    return { results: body?.results?.boxes ?? [] };
  },
};

export default boxSearchByName;
