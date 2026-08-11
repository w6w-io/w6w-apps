import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  folderIdParam,
  paginationParams,
  queryFieldsOptions,
  videoSortOptions,
} from "../lib/params.ts";

/**
 * `GET /me/projects/{project_id}/videos` — the videos in a folder.
 *
 * Videos only. Subfolders and live events live behind `folder-item-list`.
 *
 * `include_subfolders` is this endpoint's own flag and is off by default, so a
 * folder whose videos all sit one level down looks empty until it is set.
 *
 * A quiet cost worth stating: Vimeo documents that `filter_tag`,
 * `filter_tag_all_of` and `filter_tag_exclude` each "triggers a search" —
 * setting any of the three moves the request onto the search service rather
 * than a plain listing, which is a different code path with different latency
 * and different ordering guarantees. Nothing to avoid, just something to know
 * when a filtered call behaves unlike an unfiltered one.
 */
interface Input {
  folderId: string;
  query?: string;
  queryFields?: string[] | string;
  filterTag?: string;
  filterTagAllOf?: string;
  filterTagExclude?: string;
  includeSubfolders?: boolean;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const folderVideoList: ActionDefinition<Input, VimeoCollection> = {
  key: "folder-video-list",
  type: "search",
  resource: "folder",
  title: "List Videos in Folder",
  description: "List the videos inside a folder, optionally including its subfolders.",
  params: [
    folderIdParam,
    {
      key: "includeSubfolders",
      label: "Include subfolders",
      type: "boolean",
      hint: "Off by default — a folder whose videos all sit in subfolders looks empty without it.",
    },
    { key: "query", label: "Search query", type: "string" },
    {
      key: "queryFields",
      label: "Search in",
      type: "multiselect",
      options: queryFieldsOptions,
      hint: "Defaults to title, description, chapters and tags.",
    },
    {
      key: "filterTag",
      label: "Has any of these tags",
      type: "string",
      placeholder: "abc,xyz",
      hint: "Comma-separated. Using any tag filter switches Vimeo to its search service.",
    },
    { key: "filterTagAllOf", label: "Has all of these tags", type: "string" },
    { key: "filterTagExclude", label: "Excludes these tags", type: "string" },
    { key: "sort", label: "Sort by", type: "select", options: videoSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Videos" },
    { key: "total", type: "number", label: "Total videos" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection(
      `/me/projects/${idFromRef(input.folderId, "Folder ID")}/videos`,
      {
        query: {
          query: input.query,
          query_fields: toCsv(input.queryFields),
          filter_tag: toCsv(input.filterTag),
          filter_tag_all_of: toCsv(input.filterTagAllOf),
          filter_tag_exclude: toCsv(input.filterTagExclude),
          include_subfolders: input.includeSubfolders,
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

export default folderVideoList;
