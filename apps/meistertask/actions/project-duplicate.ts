import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/**
 * `POST /projects/:id/duplicate` — clone a project.
 *
 * The five `include_*` fields are documented with `type: string` and no
 * enum, but the description for each is "If set to `true` the X will be
 * duplicated" — the vendor's own convention elsewhere for a boolean flag is
 * `true`/`false` as a literal string, so these are exposed as booleans here
 * and rendered as the string MeisterTask's schema declares.
 */
interface Input {
  id: number;
  name?: string;
  notes?: string;
  includeAttachments?: boolean;
  includeChecklists?: boolean;
  includeLabels?: boolean;
  includeProjectRights?: boolean;
  includeTasks?: boolean;
}

const projectDuplicate: ActionDefinition<Input> = {
  key: "project-duplicate",
  type: "perform",
  resource: "project",
  title: "Duplicate Project",
  description: "Create a copy of a project, optionally including its tasks, checklists, " +
    "labels, attachments and project rights.",
  // Every call clones a fresh project — there is no idempotency key.
  idempotent: false,
  params: [
    { key: "id", label: "Project ID to duplicate", type: "number", required: true },
    {
      key: "name",
      label: "New project name",
      type: "string",
      hint: "Defaults to the original's name.",
    },
    {
      key: "notes",
      label: "New description",
      type: "text",
      hint: "Defaults to the original's description.",
    },
    { key: "includeTasks", label: "Include tasks", type: "boolean" },
    { key: "includeChecklists", label: "Include checklists", type: "boolean" },
    { key: "includeLabels", label: "Include labels", type: "boolean" },
    { key: "includeAttachments", label: "Include attachments", type: "boolean" },
    { key: "includeProjectRights", label: "Include project rights", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "New project ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.id}/duplicate`, {
      method: "POST",
      body: {
        name: input.name,
        notes: input.notes,
        include_attachments: input.includeAttachments === undefined
          ? undefined
          : String(input.includeAttachments),
        include_checklists: input.includeChecklists === undefined
          ? undefined
          : String(input.includeChecklists),
        include_labels: input.includeLabels === undefined ? undefined : String(input.includeLabels),
        include_project_rights: input.includeProjectRights === undefined
          ? undefined
          : String(input.includeProjectRights),
        include_tasks: input.includeTasks === undefined ? undefined : String(input.includeTasks),
      },
    });
  },
};

export default projectDuplicate;
