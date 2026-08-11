import type { ActionDefinition } from "@w6w/types";
import { BasecampClient } from "../lib/client.ts";

/** `GET /projects/{projectId}.json` — one project, including its `dock`. */
interface Input {
  projectId: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project, including the `dock` that lists its tools and their ids.",
  params: [{ key: "projectId", label: "Project ID", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Project id" },
    { key: "dock", type: "array", label: "The project's tools — each with the id actions need" },
  ],

  execute(input, ctx) {
    return new BasecampClient(ctx).request(
      `/projects/${encodeURIComponent(input.projectId)}.json`,
    );
  },
};

export default projectGet;
