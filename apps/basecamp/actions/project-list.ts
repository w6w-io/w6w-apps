import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/**
 * `GET /projects.json` — the account's projects.
 *
 * A project's `dock` is the useful part: it lists the project's tools and their
 * ids — the message board, the to-do set, the Campfire — which is where the ids
 * the other actions take actually come from. There is no separate "list message
 * boards" endpoint; you read the dock.
 *
 * Basecamp pages with `page`, and signals more pages in a `Link` header rather
 * than in the body.
 */
interface Input {
  status?: string;
  page?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description:
    "List the account's projects. Each project's `dock` carries the ids of its tools — message " +
    "board, to-do set, Campfire — which the other actions take.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "archived", label: "Archived" },
        { value: "trashed", label: "Trashed" },
      ],
      hint: "Leave empty for active projects.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
  ],
  output: [{ key: "[]", type: "array", label: "Projects — read `dock` for each tool's id" }],

  execute(input, ctx) {
    return new BasecampClient(ctx).request("/projects.json", {
      query: { status: input.status, page: input.page },
    });
  },
};

export default projectList;
