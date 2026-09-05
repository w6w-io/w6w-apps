import type { ActionDefinition } from "@w6w/types";
import { listStoryIds } from "../lib/client.ts";

/**
 * `GET /v0/jobstories.json` — up to 200 of the latest job story ids, per the
 * README.
 */
const listJobStories: ActionDefinition<Record<string, never>, { ids: number[] }> = {
  key: "list-job-stories",
  type: "read",
  resource: "story",
  title: "List Job Stories",
  description: "Fetch up to 200 of the latest job story ids.",
  params: [],
  output: [{ key: "ids", type: "array", label: "Story ids" }],

  async execute(_input, ctx) {
    const ids = await listStoryIds(ctx, "/jobstories.json");
    return { ids };
  },
};

export default listJobStories;
