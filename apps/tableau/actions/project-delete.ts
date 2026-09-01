import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

/**
 * `DELETE /sites/{siteId}/projects/{projectId}` — verified against Tableau's
 * "Delete Project" reference page.
 *
 * The vendor's own words: "When a project is deleted, all Tableau assets
 * inside of it are also deleted, including... workbooks, data sources,
 * project view options, and rights." A clone does not bring any of that
 * back, so this requires an explicit confirmation, matching the destructive
 * actions elsewhere in this pack.
 */
const action: ActionDefinition = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete a project",
  description: "Permanently delete a project and everything published inside it.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "confirm",
      label: "I understand every workbook and data source inside goes too",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Tableau does not recover a deleted project.",
    },
  ],
  output: [
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a project cannot be undone");
    }

    ctx.log("warn", "deleting a Tableau project", { projectId });

    await new TableauClient(ctx).request(`/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
    });
    return { projectId, deleted: true };
  },
};

export default action;
