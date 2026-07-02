import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  name?: string;
  notes?: string;
  color?: string;
  due_on?: string;
  owner?: string;
  team?: string;
  privacy_setting?: "private" | "private_to_team" | "public_to_workspace";
}

const updateProject: ActionDefinition<Input> = {
  key: "update-project",
  type: "perform",
  resource: "project",
  title: "Update Project",
  description: "Update a project's fields.",
  params: [
    { key: "id", label: "Project ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "color",
      label: "Color",
      type: "select",
      options: [
        "dark-blue",
        "dark-brown",
        "dark-green",
        "dark-orange",
        "dark-pink",
        "dark-purple",
        "dark-red",
        "dark-teal",
        "dark-warm-gray",
        "light-blue",
        "light-green",
        "light-orange",
        "light-pink",
        "light-purple",
        "light-red",
        "light-teal",
        "light-warm-gray",
        "light-yellow",
        "none",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "due_on", label: "Due On (YYYY-MM-DD)", type: "date" },
    { key: "owner", label: "Owner", type: "string" },
    { key: "team", label: "Team ID", type: "string" },
    {
      key: "privacy_setting",
      label: "Privacy Setting",
      type: "select",
      options: [
        { value: "private", label: "Private" },
        { value: "private_to_team", label: "Private to Team" },
        { value: "public_to_workspace", label: "Public to Workspace" },
      ],
    },
  ],

  async execute(input, ctx) {
    const { id, ...rest } = input;
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined && v !== null && v !== "") body[k] = v;
    }
    return new AsanaClient(ctx).request(`/projects/${id}`, {
      method: "PUT",
      body,
    });
  },
};

export default updateProject;
