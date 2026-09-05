import type { ActionDefinition } from "@w6w/types";
import { compact, ManusClient, type Project, type ProjectCreateResponse } from "../lib/client.ts";

/**
 * `POST /v2/project.create` — create a project: a group of tasks sharing one
 * default instruction, applied automatically to every task created within it
 * (`task-create`'s `projectId` param).
 *
 * `idempotent: false`: Manus documents no unique constraint on project name,
 * so a retry creates a second, separate project.
 */
interface Input {
  name: string;
  instruction?: string;
}

const projectCreate: ActionDefinition<Input, Project> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a project to group tasks and apply a shared instruction.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "instruction",
      label: "Instruction",
      type: "text",
      hint: 'Prepended automatically to every task created in this project (e.g. "Always ' +
        'respond in formal English").',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "instruction", type: "string", label: "Instruction" },
    { key: "created_at", type: "number", label: "Created at (Unix seconds)" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<ProjectCreateResponse>("/v2/project.create", {
      method: "POST",
      body: compact({ name: input.name, instruction: input.instruction }),
    });
    return res.project;
  },
};

export default projectCreate;
