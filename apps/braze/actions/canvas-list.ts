import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/** `GET /canvas/list` — verified against the fetched spec. Page-based (100 per page). */
const action: ActionDefinition = {
  key: "canvas-list",
  type: "read",
  resource: "canvas",
  title: "List Canvases",
  description: "Export the list of Canvases in the workspace.",
  params: [
    { key: "page", label: "Page", type: "number", default: 0, hint: "0-indexed, 100 per page." },
    { key: "includeArchived", label: "Include Archived", type: "boolean", default: false },
    {
      key: "sortDirection",
      label: "Sort Direction",
      type: "select",
      options: [
        { value: "desc", label: "Newest edited first" },
        { value: "asc", label: "Oldest edited first" },
      ],
    },
    {
      key: "lastEditTimeGt",
      label: "Last Edited After",
      type: "datetime",
      hint: "Only Canvases last edited after this ISO 8601 time.",
    },
  ],
  output: [
    { key: "canvases", type: "array", label: "Canvases" },
  ],

  async execute(input, ctx) {
    const p = input as {
      page?: number;
      includeArchived?: boolean;
      sortDirection?: string;
      lastEditTimeGt?: string;
    };
    return await new BrazeClient(ctx).get("/canvas/list", {
      page: p.page,
      include_archived: p.includeArchived,
      sort_direction: p.sortDirection || undefined,
      "last_edit.time[gt]": p.lastEditTimeGt || undefined,
    });
  },
};

export default action;
