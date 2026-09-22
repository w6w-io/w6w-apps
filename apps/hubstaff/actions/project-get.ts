import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `GET /v2/projects/{project_id}` — one project.
 *
 * Returns `{"project": {...Project}}`, the same schema `project-list` returns,
 * and is addressable by id alone (no organization). `budget` is a nested
 * `Budget` object; `client_id` is absent from the response unless the project
 * belongs to a client.
 */
interface Input {
  project_id: number;
}

const action: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get one project by ID (GET /v2/projects/{project_id}).",
  params: [projectIdParam],
  output: [{ key: "project", type: "object", label: "Project" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/projects/${input.project_id}`);
  },
};

export default action;
