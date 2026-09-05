import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `PUT /projects/:id` — update a project's name, notes, status or share mode. */
interface Input {
  id: number;
  name?: string;
  notes?: string;
  status?: number;
  shareMode?: number;
}

const projectUpdate: ActionDefinition<Input> = {
  key: "project-update",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's name, description, status or share mode.",
  // A full-overwrite PUT: repeating the same call converges on the same state.
  idempotent: true,
  params: [
    { key: "id", label: "Project ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "notes", label: "Description", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: 1, label: "Active" },
        { value: 4, label: "Trashed" },
        { value: 5, label: "Archived" },
      ],
    },
    {
      key: "shareMode",
      label: "Share mode",
      type: "select",
      hint: "MeisterTask Business plan only.",
      options: [
        { value: 0, label: "Private" },
        { value: 1, label: "Public" },
        { value: 2, label: "Team shared" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/projects/${input.id}`, {
      method: "PUT",
      body: {
        name: input.name,
        notes: input.notes,
        status: input.status,
        share_mode: input.shareMode,
      },
    });
  },
};

export default projectUpdate;
