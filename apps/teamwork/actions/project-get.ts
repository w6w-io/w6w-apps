import type { ActionDefinition } from "@w6w/types";
import { TeamworkClient } from "../lib/client.ts";
import { projectOutput } from "../lib/params.ts";

interface Input {
  projectId: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch a single project by id.",
  params: [
    { key: "projectId", label: "Project ID", type: "number", required: true },
  ],
  output: projectOutput,

  async execute(input, ctx) {
    const body = await new TeamworkClient(ctx).request<{ project: unknown }>(
      `/projects/api/v3/projects/${input.projectId}.json`,
    );
    return body.project;
  },
};

export default projectGet;
