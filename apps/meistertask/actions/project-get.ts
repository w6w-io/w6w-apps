import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `GET /projects/:id` — one project's full record. */
interface Input {
  id: number;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project by ID.",
  params: [{ key: "id", label: "Project ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "token", type: "string", label: "Project token" },
    { key: "name", type: "string", label: "Name" },
    { key: "notes", type: "string", label: "Description" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.id}`);
  },
};

export default projectGet;
