import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}/contributors` — the project's contributors. */
interface Input {
  projectId: string;
  limit?: number;
  page?: number;
}

const contributorList: ActionDefinition<Input> = {
  key: "contributor-list",
  type: "search",
  resource: "contributor",
  title: "List Contributors",
  description: "List the project's contributors and their per-language permissions.",
  params: [projectIdParam, ...paginationParams(100).filter((p) => p.key !== "cursor")],
  output: [
    { key: "items", type: "array", label: "Contributors" },
    { key: "totalCount", type: "number", label: "Total contributors" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/contributors`,
      "contributors",
      { query: paginationQuery(input) },
    );
    return { items, totalCount };
  },
};

export default contributorList;
