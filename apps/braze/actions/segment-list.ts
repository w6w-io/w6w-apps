import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /segments/list` — verified against the fetched spec. Page-based (100 per page). */
const action: ActionDefinition = {
  key: "segment-list",
  type: "read",
  resource: "segment",
  title: "List Segments",
  description: "Export the list of segments in the workspace.",
  params: [
    { key: "page", label: "Page", type: "number", default: 0, hint: "0-indexed, 100 per page." },
    {
      key: "sortDirection",
      label: "Sort Direction",
      type: "select",
      options: [
        { value: "desc", label: "Newest edited first" },
        { value: "asc", label: "Oldest edited first" },
      ],
    },
  ],
  output: [
    { key: "segments", type: "array", label: "Segments" },
  ],

  async execute(input, ctx) {
    const p = input as { page?: number; sortDirection?: string };
    return await new BrazeClient(ctx).get("/segments/list", {
      page: p.page,
      sort_direction: p.sortDirection || undefined,
    });
  },
};

export default action;
