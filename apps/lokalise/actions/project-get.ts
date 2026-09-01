import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** `GET /projects/{project_id}` — a single project's details. */
interface Input {
  projectId: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Retrieve a project's details.",
  params: [projectIdParam],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "base_language_iso", type: "string", label: "Base language" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(`/projects/${encodeId(input.projectId)}`);
  },
};

export default projectGet;
