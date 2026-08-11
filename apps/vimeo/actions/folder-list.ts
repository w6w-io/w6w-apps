import type { ActionDefinition } from "@w6w/types";
import { toCsv, VimeoClient, type VimeoCollection } from "../lib/client.ts";
import {
  directionOptions,
  fieldsParam,
  folderSortOptions,
  paginationParams,
} from "../lib/params.ts";

/**
 * `GET /me/projects` — the connected account's folders.
 *
 * ## Folders are `projects` in the URL, and only in the URL
 *
 * Vimeo renamed this feature from "projects" to "folders" in the product but
 * not in the API. The reference group is titled **Folders**, every operation id
 * says folder (`get_projects` → "Get all the folders that belong to the user"),
 * the response schema is labelled **Project**, and the path segment is
 * `/projects`. A folder's own URI therefore looks like
 * `/users/152184/projects/12345`. Nothing to do but know it; this app uses the
 * product word everywhere the user can see and the API word on the wire.
 *
 * This returns every folder, flat — including subfolders. Use
 * `folder-item-list` on a specific folder to see its immediate children.
 */
interface Input {
  query?: string;
  sort?: string;
  direction?: string;
  page?: number;
  perPage?: number;
  fields?: string;
}

const folderList: ActionDefinition<Input, VimeoCollection> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List the folders belonging to the connected Vimeo account.",
  params: [
    { key: "query", label: "Search query", type: "string" },
    { key: "sort", label: "Sort by", type: "select", options: folderSortOptions },
    { key: "direction", label: "Direction", type: "select", options: directionOptions },
    ...paginationParams,
    fieldsParam,
  ],
  output: [
    { key: "data", type: "array", label: "Folders" },
    { key: "total", type: "number", label: "Total folders" },
    { key: "paging", type: "object", label: "First/last/next/previous page URIs" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).collection("/me/projects", {
      query: {
        query: input.query,
        sort: input.sort,
        direction: input.direction,
        page: input.page,
        per_page: input.perPage,
        fields: toCsv(input.fields),
      },
    });
  },
};

export default folderList;
