import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `POST /projects/:project_id/sections` — add a new section (column) to a project. */
interface Input {
  projectId: number;
  name: string;
}

const sectionCreate: ActionDefinition<Input> = {
  key: "section-create",
  type: "perform",
  resource: "section",
  title: "Create Section",
  description: "Create a new section (column) in a project.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Section ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "sequence", type: "number", label: "Sequence" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.projectId}/sections`, {
      method: "POST",
      body: { name: input.name },
    });
  },
};

export default sectionCreate;
