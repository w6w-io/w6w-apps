import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, videoUri, VimeoClient } from "../lib/client.ts";
import { folderIdParam } from "../lib/params.ts";

/**
 * Add one or several videos to a folder.
 *
 * Vimeo publishes two endpoints for this and they take their input differently,
 * which is the whole reason this action branches:
 *
 *  - `PUT /me/projects/{project_id}/videos/{video_id}` — one video, identified
 *    in the **path** by bare id.
 *  - `PUT /me/projects/{project_id}/videos` — several, identified in the
 *    **body** by a comma-separated list of full `uris`
 *    (`/videos/258684937,/videos/273576296`). Ids alone are rejected.
 *
 * One video goes through the single-video endpoint rather than a one-element
 * bulk call, because that is the endpoint Vimeo documents for the case and it
 * needs no body at all.
 *
 * Both answer `204`, so this returns `{ added, folderId, videoIds }`.
 *
 * `idempotent: true` — a video is either in a folder or not, and adding it
 * again lands in the same state.
 */
interface Input {
  folderId: string;
  videoIds: string;
}

const folderVideoAdd: ActionDefinition<
  Input,
  { added: boolean; folderId: string; videoIds: string[] }
> = {
  key: "folder-video-add",
  type: "perform",
  resource: "folder",
  title: "Add Videos to Folder",
  description: "Move one or more videos into a folder.",
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
  ],
  output: [
    { key: "added", type: "boolean", label: "Whether the add succeeded" },
    { key: "folderId", type: "string", label: "The folder ID" },
    { key: "videoIds", type: "array", label: "The video IDs added" },
  ],

  async execute(input, ctx) {
    const folderId = idFromRef(input.folderId, "Folder ID");
    const raw = toCsv(input.videoIds);
    if (!raw) throw new Error("Video IDs is required");
    const ids = raw.split(",");
    const client = new VimeoClient(ctx);
    const base = `/me/projects/${folderId}/videos`;

    if (ids.length === 1) {
      await client.request(`${base}/${idFromRef(ids[0], "Video ID")}`, { method: "PUT" });
    } else {
      // The bulk endpoint takes full URIs as one comma-separated string, not ids
      // and not an array.
      await client.request(base, {
        method: "PUT",
        body: { uris: ids.map(videoUri).join(",") },
      });
    }

    return { added: true, folderId, videoIds: ids.map((id) => idFromRef(id, "Video ID")) };
  },
};

export default folderVideoAdd;
