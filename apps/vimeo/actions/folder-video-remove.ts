import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, videoUri, VimeoClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

/**
 * Remove one or several videos from a folder.
 *
 * The mirror of `folder-video-add`, with the same two-endpoint split — path id
 * for one, body `uris` for many — and one asymmetry that matters:
 *
 * **Only the bulk endpoint can delete.** `DELETE
 * /me/projects/{project_id}/videos` accepts `should_delete_clips` and
 * `send_to_recently_deleted`; `DELETE
 * /me/projects/{project_id}/videos/{video_id}` accepts neither and Vimeo states
 * flatly that it "doesn't delete the video itself". So when a caller asks to
 * delete the videos, this action uses the bulk endpoint even for a single
 * video — otherwise the flag would be silently dropped and the videos would
 * survive a request that said to destroy them.
 *
 * `send_to_recently_deleted` is only meaningful alongside `should_delete_clips`
 * ("When deleting clips, use Recently Deleted purgatory when true") and is
 * never sent alone.
 *
 * Both endpoints answer `204`. `idempotent: true` describes retry safety.
 */
interface Input {
  folderId: string;
  videoIds: string;
  shouldDeleteClips?: boolean;
  sendToRecentlyDeleted?: boolean;
}

const folderVideoRemove: ActionDefinition<
  Input,
  { removed: boolean; folderId: string; videoIds: string[]; deletedVideos: boolean }
> = {
  key: "folder-video-remove",
  type: "perform",
  resource: "folder",
  title: "Remove Videos from Folder",
  description:
    "Take one or more videos out of a folder. By default the videos stay in the account.",
  idempotent: true,
  params: [
    folderIdParam,
    {
      key: "videoIds",
      label: "Video IDs",
      type: "string",
      required: true,
      placeholder: "258684937,273576296",
      hint: "Comma-separated. IDs or `/videos/…` URIs; both work.",
    },
    {
      key: "shouldDeleteClips",
      label: "Delete the videos too",
      type: "boolean",
      hint: "Off by default: the videos leave the folder but stay in the account.",
    },
    {
      key: "sendToRecentlyDeleted",
      label: "Send them to Recently Deleted",
      type: "boolean",
      hint: "Only has an effect alongside Delete the videos too.",
    },
  ],
  output: [
    { key: "removed", type: "boolean", label: "Whether the removal succeeded" },
    { key: "folderId", type: "string", label: "The folder ID" },
    { key: "videoIds", type: "array", label: "The video IDs removed" },
    { key: "deletedVideos", type: "boolean", label: "Whether the videos were deleted as well" },
  ],

  async execute(input, ctx) {
    const folderId = idFromRef(input.folderId, "Folder ID");
    const raw = toCsv(input.videoIds);
    if (!raw) throw new Error("Video IDs is required");
    const ids = raw.split(",");
    const client = new VimeoClient(ctx);
    const base = `/me/projects/${folderId}/videos`;
    const deleteClips = input.shouldDeleteClips === true;

    // The single-video endpoint cannot delete, so anything that must delete goes
    // through the bulk one even for one video.
    if (ids.length === 1 && !deleteClips) {
      await client.request(`${base}/${idFromRef(ids[0], "Video ID")}`, { method: "DELETE" });
    } else {
      const body: Record<string, unknown> = { uris: ids.map(videoUri).join(",") };
      if (input.shouldDeleteClips !== undefined) body.should_delete_clips = input.shouldDeleteClips;
      if (deleteClips && input.sendToRecentlyDeleted !== undefined) {
        body.send_to_recently_deleted = input.sendToRecentlyDeleted;
      }
      await client.request(base, { method: "DELETE", body });
    }

    return {
      removed: true,
      folderId,
      videoIds: ids.map((id) => idFromRef(id, "Video ID")),
      deletedVideos: deleteClips,
    };
  },
};

export default folderVideoRemove;
