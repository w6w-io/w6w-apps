import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput, pageParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/labels` — a project's labels.
 *
 * Labels and photo tags are the same entity in this API: both list and return
 * the `Tag` schema, with `display_value` (what a person sees) and `value` (its
 * lowercase form, which is what search and sort use). The two are kept as
 * separate actions because the endpoints differ, not because the data does.
 */
interface Input {
  projectId: string;
  page?: number;
  perPage?: number;
}

const projectLabelList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-label-list",
  type: "search",
  resource: "project",
  title: "List Project Labels",
  description: "List the labels applied to a project. Labels use the same Tag shape as photos.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    ...pageParams(),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(
      `/projects/${encodeId(input.projectId)}/labels`,
      { query: paginationQuery(input) },
    );
  },
};

export default projectLabelList;
