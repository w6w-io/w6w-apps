import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  folderIdParam,
  folderItemFilterOptions,
  folderItemSortOptions,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /me/projects/{project_id}/items` — everything directly inside a folder.
 *
 * ## Items are not videos
 *
 * `get_folder_items` returns "every item that belongs to the specified folder",
 * and a folder holds three kinds of thing: **videos, subfolders and live
 * events**. Its `filter` enum says so outright — `video`, `folder`,
 * `live_event`. `folder-video-list` is the other endpoint
 * (`/projects/{id}/videos`) and returns only videos; if a subfolder seems to
 * have vanished, that is which of the two was called.
 *
 * `clip_privacy_filters` takes a comma-separated list of the video privacy
 * types to keep — Vimeo documents `private`, `public`, `password` and
 * `hide_from_vimeo` for it, and it is a documented free-form list rather than a
 * closed enum, so it is exposed as a string with the accepted values in the
 * hint rather than as a select that could go stale.
 */
interface Input {
  folderId: string;
  filter?: string;
  clipPrivacyFilters?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const folderItemList: ActionDefinition<Input, VimeoCollection> = {
  key: "folder-item-list",
  type: "search",
  resource: "folder",
  title: "List Folder Items",
  description: "List everything directly inside a folder — videos, subfolders and live events.",
  params: [
    folderIdParam,
    {
      key: "filter",
      label: "Only this kind",
      type: "select",
      options: folderItemFilterOptions,
      hint: "Leave blank to get all three kinds.",
    },
    {
      key: "clipPrivacyFilters",
      label: "Video privacy types",
      type: "string",
      placeholder: "private,unlisted,hide_from_vimeo",
      hint: "Comma-separated. Vimeo documents `private`, `public`, `password` and " +
        "`hide_from_vimeo`.",
    },
    { key: "sort", label: "Sort by", type: "select", options: folderItemSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Folder items" },
    { key: "total", type: "number", label: "Total items" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection(
      `/me/projects/${idFromRef(input.folderId, "Folder ID")}/items`,
      {
        query: {
          filter: input.filter,
          clip_privacy_filters: toCsv(input.clipPrivacyFilters),
          sort: input.sort,
          direction: input.direction,
          page: input.page,
          per_page: input.perPage,
          fields: toCsv(input.fields),
        },
      },
    );
  },
};

export default folderItemList;
