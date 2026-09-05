import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /projects/:project_id/persons` — everyone with access to a project. */
interface Input {
  projectId: number;
}

const projectPersonList: ActionDefinition<Input, unknown[]> = {
  key: "project-person-list",
  type: "search",
  resource: "person",
  title: "List Project Persons",
  description: "List the people who have access to a project.",
  params: [{ key: "projectId", label: "Project ID", type: "number", required: true }],
  output: [{ key: "", type: "array", label: "Persons" }],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request<unknown[]>(`/projects/${input.projectId}/persons`);
  },
};

export default projectPersonList;
