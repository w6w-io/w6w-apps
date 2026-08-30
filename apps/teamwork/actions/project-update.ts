import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient, unset } from "../lib/client.ts";

interface Input {
  projectId: number;
  name?: string;
  description?: string;
  status?: string;
  private?: boolean;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Change a project's fields, or archive/unarchive it via status. Uses Teamwork's " +
    "V1 project endpoint (`PUT /projects/{id}.json`) — only the fields you set are touched.",
  // Same projectId every retry, and Teamwork's PUT is a partial merge —
  // safe to retry with the same body.
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "description", label: "Description", type: "text", config: { multiline: true } },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active (unarchive)" },
        { value: "inactive", label: "Inactive (archive)" },
      ],
      hint: "Archive or unarchive the project.",
    },
    { key: "private", label: "Private", type: "boolean", advanced: true },
  ],
  output: [{ key: "STATUS", type: "string", label: "Status" }],

  execute(input, ctx) {
    return new TeamworkClient(ctx).request(`/projects/${input.projectId}.json`, {
      method: "PUT",
      body: {
        project: {
          name: unset(input.name),
          description: unset(input.description),
          status: unset(input.status),
          private: input.private,
        },
      },
    });
  },
};

export default projectUpdate;
