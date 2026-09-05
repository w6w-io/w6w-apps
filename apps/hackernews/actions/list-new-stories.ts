import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/newstories.json` — up to 500 of the newest story ids, per the
 * README. Newest first; fetch each id with Get Item for details.
 */
const listNewStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-new-stories",
  type: "read",
  resource: "story",
  title: "List New Stories",
  description: "Fetch up to 500 of the newest story ids.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids, newest first" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/newstories.json");
    return { ids };
  },
};

export default listNewStories;
