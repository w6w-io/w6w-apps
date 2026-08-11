import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v1/studio/projects/{project_id}` — one Studio project in full.
 *
 * Returns `ProjectExtendedResponseModel`, which is the list entry plus the
 * chapter breakdown and the project's default generation settings — the detail
 * the list response does not carry.
 *
 * `share_id` is exposed because it is how a project shared out of the workspace
 * is addressed; without one the read is scoped to the connected account.
 */
interface Input {
  projectId: string;
  shareId?: string;
}

const studioProjectGet: ActionDefinition<Input> = {
  key: "studio-project-get",
  type: "read",
  resource: "studio",
  title: "Get Studio Project",
  description: "Fetch one Studio project in full, including its chapters and default settings.",
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint: "Take it from a List Studio Projects result.",
    },
    {
      key: "shareId",
      label: "Share ID",
      type: "string",
      advanced: true,
      hint: "Only for a project shared out of the workspace. Leave empty otherwise.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "Where the project is in the convert pipeline" },
    { key: "chapters", type: "array", label: "The project's chapters" },
  ],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/studio/projects/${encodeId(input.projectId)}`, {
      query: { share_id: input.shareId },
    });
  },
};

export default studioProjectGet;
