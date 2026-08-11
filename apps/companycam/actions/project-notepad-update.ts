import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /v2/projects/{id}/notepad` — replace the project's notepad.
 *
 * **This replaces, it does not append.** The notepad is one string and the body
 * carries the whole of it, so a workflow adding a line must read the current
 * value with `project-get` first. There is no append endpoint.
 *
 * The response is `{"notepad": "…"}` and nothing else — not the project — and
 * the documented status is `201` even though nothing was created.
 *
 * Idempotent: writing the same text twice leaves the same text.
 */
interface Input {
  projectId: string;
  notepad: string;
}

const projectNotepadUpdate: ActionDefinition<Input> = {
  key: "project-notepad-update",
  type: "perform",
  resource: "project",
  title: "Update Project Notepad",
  description: "Replace a project's notepad text. Read the project first to append rather " +
    "than overwrite.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "notepad",
      label: "Notepad",
      type: "text",
      required: true,
      hint: "Replaces the entire notepad.",
    },
  ],
  output: [
    { key: "notepad", type: "string", label: "Notepad" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/notepad`, {
      method: "PUT",
      body: { notepad: input.notepad },
    });
  },
};

export default projectNotepadUpdate;
