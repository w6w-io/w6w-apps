import type { ActionDefinition } from "@w6w/types";
import { TableauClient } from "../lib/client.ts";

interface Project {
  id: string;
  name: string;
  description?: string;
  parentProjectId?: string;
  contentPermissions?: string;
}

/**
 * `POST /sites/{siteId}/projects` — verified against Tableau's "Create
 * Project" reference page.
 *
 * Only server/site administrators can call this — the reference page states
 * it plainly ("Only Tableau Administrators can update a project", the same
 * sentence used for the create endpoint). A non-admin PAT gets a 403.
 */
const action: ActionDefinition = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create a project",
  description: "Create a project, optionally nested under a parent project.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text", default: "" },
    {
      key: "parentProjectId",
      label: "Parent Project ID",
      type: "string",
      default: "",
      hint: "Omit to create a top-level project.",
    },
    {
      key: "contentPermissions",
      label: "Content Permissions",
      type: "select",
      default: "ManagedByOwner",
      options: [
        { value: "ManagedByOwner", label: "Managed by owner" },
        { value: "LockedToProject", label: "Locked to project" },
        { value: "LockedToProjectWithoutNested", label: "Locked to project, not nested" },
      ],
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    ctx.log("info", "creating a Tableau project", { name });

    const body = await new TableauClient(ctx).request<{ project: Project }>("/projects", {
      method: "POST",
      body: {
        project: {
          name,
          description: (p.description as string) || undefined,
          parentProjectId: (p.parentProjectId as string) || undefined,
          contentPermissions: (p.contentPermissions as string) || "ManagedByOwner",
        },
      },
    });
    return body.project;
  },
};

export default action;
