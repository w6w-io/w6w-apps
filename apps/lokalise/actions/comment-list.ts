import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { paginationParams, paginationQuery, projectIdParam } from "../lib/params.ts";

/**
 * `GET /projects/{project_id}/comments` — every comment across the whole
 * project (not scoped to one key — see `key-get`'s `includeComments` for
 * that).
 */
interface Input {
  projectId: string;
  limit?: number;
  page?: number;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Project Comments",
  description: "List every comment left on any key in the project.",
  params: [projectIdParam, ...paginationParams(100).filter((p) => p.key !== "cursor")],
  output: [
    { key: "items", type: "array", label: "Comments" },
    { key: "totalCount", type: "number", label: "Total comments" },
  ],

  async execute(input, ctx) {
    const { items, totalCount } = await new LokaliseClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/comments`,
      "comments",
      { query: paginationQuery(input) },
    );
    return { items, totalCount };
  },
};

export default commentList;
