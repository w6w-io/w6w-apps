import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/askstories.json` — up to 200 of the latest Ask HN story ids, per
 * the README.
 */
const listAskStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-ask-stories",
  type: "read",
  resource: "story",
  title: "List Ask HN Stories",
  description: "Fetch up to 200 of the latest Ask HN story ids.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/askstories.json");
    return { ids };
  },
};

export default listAskStories;
