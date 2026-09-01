import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get a single project by id.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [{ key: "project", type: "object", label: "Project" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/projects/${input.projectId}`);
  },
};

export default projectGet;
