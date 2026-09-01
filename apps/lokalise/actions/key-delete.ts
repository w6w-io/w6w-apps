import type { ActionDefinition } from "@w6w/types";
import { encodeId, LokaliseClient } from "../lib/client.ts";
import { keyIdParam, projectIdParam } from "../lib/params.ts";

/**
 * `DELETE /projects/{project_id}/keys/{key_id}` — delete a single key.
 *
 * ## `200` does not mean the key is gone
 *
 * Lokalise's own documented example response is
 * `{"project_id": "...", "key_removed": false, "keys_locked": 1}` — a `200`
 * where the key was **not** removed, because it is locked by an active task.
 * `key_removed` is the field that says what actually happened; the HTTP
 * status only says the request was well-formed.
 *
 * ## Not supported on Documents projects
 *
 * Lokalise's own compatibility note: Documents-type projects manage keys
 * through file operations and do not support deleting an individual key by
 * id. Calling this against one answers with an error this app surfaces
 * verbatim rather than trying to detect the project type in advance.
 *
 * Idempotent: the end state after one call and after five is the same key
 * gone (a repeat call answers `404`, surfaced as an error).
 */
interface Input {
  projectId: string;
  keyId: number;
}

const keyDelete: ActionDefinition<Input> = {
  key: "key-delete",
  type: "perform",
  resource: "key",
  title: "Delete Key",
  description: "Delete a single key from the project.",
  idempotent: true,
  params: [projectIdParam, keyIdParam],
  output: [
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "key_removed", type: "boolean", label: "Whether the key was actually removed" },
    { key: "keys_locked", type: "number", label: "Keys that blocked removal (locked by a task)" },
  ],

  execute(input, ctx) {
    return new LokaliseClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/keys/${encodeId(input.keyId)}`,
      { method: "DELETE" },
    );
  },
};

export default keyDelete;
