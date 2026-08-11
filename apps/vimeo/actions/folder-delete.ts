import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

/**
 * `DELETE /me/projects/{project_id}` — delete a folder.
 *
 * ## The dangerous parameter, and why it defaults to off
 *
 * `delete_project` takes an optional body: "This method deletes the specified
 * folder **and optionally also the videos that it contains**."
 *
 *  - `should_delete_clips` — delete every video in the folder along with it.
 *  - `send_to_recently_deleted` — "When true **and should_delete_clips is
 *    true**", the videos go to the 30-day Recently Deleted bucket instead of
 *    being destroyed. It does nothing on its own.
 *
 * Deleting the folder alone leaves its videos in the account. Both flags are
 * left unset unless the caller asks for them, and `sendToRecentlyDeleted` is
 * only forwarded when `shouldDeleteClips` is on, because sending it alone is
 * an instruction Vimeo has no meaning for and would only make the request look
 * like it did something it did not.
 *
 * Answers `204`, so this returns `{ deleted, folderId }` rather than an empty
 * body. `idempotent: true` describes retry safety, not reversibility.
 */
interface Input {
  folderId: string;
  shouldDeleteClips?: boolean;
  sendToRecentlyDeleted?: boolean;
}

const folderDelete: ActionDefinition<Input, { deleted: boolean; folderId: string }> = {
  key: "folder-delete",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description:
    "Delete a folder. By default the videos inside it stay in the account; turn on Delete " +
    "videos too to remove them as well.",
  idempotent: true,
  params: [
    folderIdParam,
    {
      key: "shouldDeleteClips",
      label: "Delete the videos too",
      type: "boolean",
      hint: "Off by default: the folder goes, the videos stay in the account.",
    },
    {
      key: "sendToRecentlyDeleted",
      label: "Send those videos to Recently Deleted",
      type: "boolean",
      hint: "Only has an effect alongside Delete the videos too. Puts them in the 30-day " +
        "Recently Deleted bucket instead of destroying them.",
    },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete succeeded" },
    { key: "folderId", type: "string", label: "The deleted folder ID" },
  ],

  async execute(input, ctx) {
    const folderId = idFromRef(input.folderId, "Folder ID");
    const body: Record<string, unknown> = {};
    if (input.shouldDeleteClips !== undefined) body.should_delete_clips = input.shouldDeleteClips;
    // Vimeo defines this only in combination with should_delete_clips, so it is
    // never sent alone.
    if (input.shouldDeleteClips && input.sendToRecentlyDeleted !== undefined) {
      body.send_to_recently_deleted = input.sendToRecentlyDeleted;
    }

    await new VimeoClient(ctx).request(`/me/projects/${folderId}`, {
      method: "DELETE",
      body: Object.keys(body).length > 0 ? body : undefined,
    });
    return { deleted: true, folderId };
  },
};

export default folderDelete;
