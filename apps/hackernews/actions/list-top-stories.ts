import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/topstories.json` — up to 500 current top story (and job) ids, per
 * the README. Order is the ranking; fetch each id with Get Item for details.
 */
const listTopStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-top-stories",
  type: "read",
  resource: "story",
  title: "List Top Stories",
  description: "Fetch up to 500 current top story ids, in ranked order.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids, ranked" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/topstories.json");
    return { ids };
  },
};

export default listTopStories;
