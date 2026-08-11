import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/projects/{id}` — one project, in full.
 *
 * This is the only place several fields appear: `notepad` (the project's free
 * text), `primary_contact`, `geofence`, `integrations` (the third-party
 * records this project is linked to, e.g. `{"type": "JobNimbus"}`) and both
 * URLs — `project_url` for a human and `embedded_project_url` for an iframe.
 */
interface Input {
  projectId: string;
}

const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Retrieve Project",
  description: "Fetch a single project by id, including its notepad, contact and integrations.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "archived", type: "boolean", label: "Archived" },
    { key: "address", type: "object", label: "Address" },
    { key: "coordinates", type: "object", label: "Coordinates" },
    { key: "notepad", type: "string", label: "Notepad" },
    { key: "primary_contact", type: "object", label: "Primary contact" },
    { key: "integrations", type: "array", label: "Linked third-party records" },
    { key: "project_url", type: "string", label: "Project URL" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}`);
  },
};

export default projectGet;
