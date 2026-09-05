import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/** `GET /api/clip-projects/{projectId}` — read a project's current state. */
interface Input {
  projectId: string;
}

const clipProjectGet: ActionDefinition<Input> = {
  key: "clip-project-get",
  type: "read",
  resource: "clip-project",
  title: "Get Project",
  description: "Get a clip project's current stage, model and metadata.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "stage", type: "string", label: "Processing stage" },
    { key: "model", type: "string", label: "Curation model used" },
    { key: "sourcePlatform", type: "string", label: "Source platform" },
    { key: "visibility", type: "string", label: "Visibility" },
    { key: "error", type: "string", label: "Error, if any" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Last updated at" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).json(
      `/api/clip-projects/${encodeURIComponent(input.projectId)}`,
    );
  },
};

export default clipProjectGet;
