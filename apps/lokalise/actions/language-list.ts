import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}/languages` — a project's configured languages. */
interface Input {
  projectId: string;
  limit?: number;
  page?: number;
}

const languageList: ActionDefinition<Input> = {
  key: "language-list",
  type: "search",
  resource: "language",
  title: "List Project Languages",
  description: "List the languages configured for a project.",
  params: [projectIdParam, ...paginationParams(100).filter((p) => p.key !== "cursor")],
  output: [
    { key: "items", type: "array", label: "Languages" },
    { key: "totalCount", type: "number", label: "Total project languages" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/languages`,
      "languages",
      { query: paginationQuery(input) },
    );
    return { items, totalCount };
  },
};

export default languageList;
