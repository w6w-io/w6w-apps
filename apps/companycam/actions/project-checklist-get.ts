import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/projects/{project_id}/checklists/{id}` — one checklist, in full.
 *
 * Both ids are required: a checklist is addressed through its project, not on
 * its own. `completed_at` is null until every task is done, and
 * `sectionless_tasks` holds the tasks that belong to no section — read both, or
 * a workflow counting tasks will under-count.
 */
interface Input {
  projectId: string;
  checklistId: string;
}

const projectChecklistGet: ActionDefinition<Input> = {
  key: "project-checklist-get",
  type: "read",
  resource: "checklist",
  title: "Retrieve Project Checklist",
  description: "Fetch one checklist on a project, with its sections, tasks and sub-tasks.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    { key: "checklistId", label: "Checklist ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Checklist ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "completed_at", type: "number", label: "Completed at (Unix seconds)" },
    { key: "sections", type: "array", label: "Sections" },
    { key: "sectionless_tasks", type: "array", label: "Tasks outside any section" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/checklists/${encodeId(input.checklistId)}`,
    );
  },
};

export default projectChecklistGet;
