import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/beststories.json` — up to 500 of the best current story ids, per
 * the README.
 */
const listBestStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-best-stories",
  type: "read",
  resource: "story",
  title: "List Best Stories",
  description: "Fetch up to 500 of the best current story ids.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/beststories.json");
    return { ids };
  },
};

export default listBestStories;
