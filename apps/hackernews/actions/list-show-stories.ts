import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/showstories.json` — up to 200 of the latest Show HN story ids, per
 * the README.
 */
const listShowStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-show-stories",
  type: "read",
  resource: "story",
  title: "List Show HN Stories",
  description: "Fetch up to 200 of the latest Show HN story ids.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/showstories.json");
    return { ids };
  },
};

export default listShowStories;
