import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient } from "../lib/client.ts";

/**
 * `GET /v1/studio/projects` — the long-form Studio projects in this workspace.
 *
 * Studio is ElevenLabs' long-form editor: audiobooks, articles and podcasts made
 * of chapters, rather than the single-request synthesis the Text to Speech
 * actions do. A project's `state` says where it is in the convert pipeline,
 * which is the field a workflow polls.
 *
 * ## No paging, on purpose
 *
 * The endpoint declares no query parameters at all — it returns every project in
 * one `{projects: […]}` response. That is the vendor's design, not an omission
 * here, and it is why this action takes no parameters.
 */
const studioProjectList: ActionDefinition<Record<string, never>> = {
  key: "studio-project-list",
  type: "read",
  resource: "studio",
  title: "List Studio Projects",
  description: "List every Studio (long-form) project in this workspace.",
  params: [],
  output: [{
    key: "projects",
    type: "array",
    label: "The projects, with their state and metadata",
  }],

  execute(_input, ctx) {
    return new ElevenLabsClient(ctx).json("/v1/studio/projects");
  },
};

export default studioProjectList;
