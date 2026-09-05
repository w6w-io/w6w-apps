import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `POST /projects` — create a project. */
interface Input {
  name: string;
  notes?: string;
  shareMode?: number;
}

const projectCreate: ActionDefinition<Input> = {
  key: "project-create",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description: "Create a new project.",
  // Every call creates a distinct project; there is no idempotency key.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "notes", label: "Description", type: "text" },
    {
      key: "shareMode",
      label: "Share mode",
      type: "select",
      hint: "MeisterTask Business plan only.",
      options: [
        { value: 0, label: "Private (default)" },
        { value: 1, label: "Public" },
        { value: 2, label: "Team shared" },
      ],
    },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "token", type: "string", label: "Project token" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "number", label: "Status" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request("/projects", {
      method: "POST",
      body: { name: input.name, notes: input.notes, share_mode: input.shareMode },
    });
  },
};

export default projectCreate;
