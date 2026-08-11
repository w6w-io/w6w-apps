import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/comments` — comments on a project.
 *
 * Project and photo comments share one `Comment` schema, distinguished by
 * `commentable_type` (`"Project"` / `"Photo"`) and `commentable_id`. The
 * content "may contain whitespace characters such as newlines", per the
 * vendor — it is not a single line.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectCommentList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-comment-list",
  type: "search",
  resource: "comment",
  title: "List Project Comments",
  description: "List the comments left on a project.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/comments`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectCommentList;
