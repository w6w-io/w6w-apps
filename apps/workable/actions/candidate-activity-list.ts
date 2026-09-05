import type { ActionDefinition } from "@w6w/types";
import { compact, WorkableClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  id: string;
  actions?: string;
  updatedAfter?: string;
  limit?: number;
  sinceId?: string;
  maxId?: string;
  pageUrl?: string;
}

const candidateActivityList: ActionDefinition<Input> = {
  key: "candidate-activity-list",
  type: "read",
  resource: "candidate",
  title: "List Candidate Activity",
  description:
    "The activity stream for one candidate — stage moves, comments, ratings. Required scope: " +
    "`r_candidates`.",
  params: [
    { key: "id", label: "Candidate ID", type: "string", required: true },
    {
      key: "actions",
      label: "Filter by action",
      type: "string",
      advanced: true,
      hint: "Comma-delimited list of activity actions.",
    },
    {
      key: "updatedAfter",
      label: "Updated after",
      type: "string",
      advanced: true,
      hint: "ISO 8601 or Unix time.",
    },
    ...pagination,
  ],
  output: [
    { key: "activities", type: "array", label: "Activities" },
    { key: "nextUrl", type: "string", label: "Next page URL" },
  ],

  async execute(input, ctx) {
    const client = new WorkableClient(ctx);
    const path = `/candidates/${encodeURIComponent(input.id)}/activities`;
    const page = input.pageUrl
      ? await client.list(input.pageUrl, "activities")
      : await client.list(path, "activities", {
        query: compact({
          actions: input.actions,
          updated_after: input.updatedAfter,
          limit: input.limit,
          since_id: input.sinceId,
          max_id: input.maxId,
        }),
      });
    return { activities: page.items, nextUrl: page.nextUrl };
  },
};

export default candidateActivityList;
