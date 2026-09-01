import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/**
 * `DELETE /projects/{project_id}/files/{file_id}` — delete a file and every
 * key attributed to it.
 *
 * ## The mirror image of `key-delete`'s project-type restriction
 *
 * Per Lokalise's own compatibility note, this is supported on **Documents**
 * and **Marketing** projects but explicitly **not supported on Software
 * projects** (`localization_files`) — the exact opposite of `key-delete`,
 * which works on Software and Marketing projects but not Documents ones.
 * Calling this against a Software project answers `400
 * "Action not supported by this type of project"`, surfaced verbatim rather
 * than guessed at in advance.
 *
 * Idempotent: the end state after one call and after five is the same file
 * (and its keys) gone.
 */
interface Input {
  projectId: string;
  fileId: number;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description:
    "Delete a file and every key attributed to it. Documents and Marketing projects only — not " +
    "supported on Software (localization_files) projects.",
  idempotent: true,
  params: [
    projectIdParam,
    {
      key: "fileId",
      label: "File ID",
      type: "number",
      required: true,
      hint: "From the `file_id` field of a List Files result.",
    },
  ],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "file_deleted", type: "boolean", label: "Whether the file was deleted" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/files/${encodeId(input.fileId)}`,
      { method: "DELETE" },
    );
  },
};

export default fileDelete;
