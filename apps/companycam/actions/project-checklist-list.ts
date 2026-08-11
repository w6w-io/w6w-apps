import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, type ListPage } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}/checklists` — checklists on one project.
 *
 * **This endpoint takes no pagination parameters at all** — no `page`, no
 * `per_page` — unlike the company-wide `GET /v2/checklists`. Whatever a project
 * has, you get.
 *
 * Rows are full checklists: `sections`, each with `tasks`, each with
 * `sub_tasks` and any `photos` attached to the task. `is_populating` is true
 * while CompanyCam is still building a checklist created from a template, and a
 * workflow reading tasks before that flips will see an incomplete list.
 */
interface Input {
  projectId: string;
}

const projectChecklistList: ActionDefinition<Input, ListPage<Record<string, unknown>>> = {
  key: "project-checklist-list",
  type: "search",
  resource: "checklist",
  title: "List Project Checklists",
  description:
    "List a project's checklists in full, including sections, tasks and sub-tasks. Takes no " +
    "pagination.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CompanyCamClient(ctx).list(`/projects/${encodeId(input.projectId)}/checklists`);
  },
};

export default projectChecklistList;
