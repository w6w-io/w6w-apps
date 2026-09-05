import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/clip-projects/{projectId}/update-visibility` — share or unshare a
 * project.
 *
 * Idempotent: setting the same visibility twice leaves the project in the
 * same documented state either way.
 */
interface Input {
  projectId: string;
  visibility: "DEFAULT" | "PUBLIC";
}

const clipProjectUpdateVisibility: ActionDefinition<Input> = {
  key: "clip-project-update-visibility",
  type: "perform",
  resource: "clip-project",
  title: "Share Project",
  description: "Set a project's visibility. PUBLIC lets anyone open, edit and export it; " +
    "DEFAULT restricts it to team members.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      required: true,
      options: [
        { value: "DEFAULT", label: "Default (team members only)" },
        { value: "PUBLIC", label: "Public (anyone with the link)" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "visibility", type: "string", label: "Visibility" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).json(
      `/api/clip-projects/${encodeURIComponent(input.projectId)}/update-visibility`,
      { method: "POST", body: { visibility: input.visibility } },
    );
  },
};

export default clipProjectUpdateVisibility;
