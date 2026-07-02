import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  name: string;
  workspace: string;
  team?: string;
  color?: string;
  due_on?: string;
  notes?: string;
  privacy_setting?: "private" | "private_to_team" | "public_to_workspace";
}

const createProject: ActionDefinition<Input> = {
  key: "create-project",
  type: "perform",
  resource: "project",
  title: "Create Project",
  description:
    "Create a project. When `team` is set, posts to `/teams/{team}/projects`; otherwise, posts to `/projects` with `workspace` in the body.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "workspace", label: "Workspace ID", type: "string", required: true },
    { key: "team", label: "Team ID", type: "string" },
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
    { key: "notes", label: "Notes", type: "text" },
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
    const client = new AsanaClient(ctx);
    const body: Record<string, unknown> = {
      name: input.name,
      workspace: input.workspace,
    };
    for (const k of ["color", "due_on", "notes", "privacy_setting"] as const) {
      const v = input[k];
      if (v !== undefined && v !== null && v !== "") body[k] = v;
    }
    if (input.team) {
      return client.request(`/teams/${input.team}/projects`, { method: "POST", body });
    }
    return client.request(`/projects`, { method: "POST", body });
  },
};

export default createProject;
