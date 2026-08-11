import type { ActionDefinition } from "@w6w/types";
import { encodeId, MotionClient, V1 } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `GET /v1/projects/{id}` — one project.
 *
 * Like a task, a project carries `customFieldValues` keyed by the field's
 * **name** rather than its id, each value a `{type, value}` pair.
 */
interface Input {
  id: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project by id.",
  params: [projectIdParam],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description (HTML)" },
    { key: "workspaceId", type: "string", label: "Workspace ID" },
    { key: "status.name", type: "string", label: "Status" },
    { key: "createdTime", type: "string", label: "Created" },
    { key: "updatedTime", type: "string", label: "Last updated" },
    { key: "customFieldValues", type: "object", label: "Custom field values, keyed by field NAME" },
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).json(`${V1}/projects/${encodeId(input.id)}`);
  },
};

export default projectGet;
