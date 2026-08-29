import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, WrikeClient } from "../lib/client.ts";
import { paginationParams, rawParamsParam } from "../lib/params.ts";

/**
 * `GET /folders` — list the account's folders (which includes projects and
 * spaces — Wrike models all three as "folders" with different flags set).
 *
 * The endpoint runs in one of two documented modes, distinguished by the
 * response's own `kind` field: with no filter parameters it returns
 * **Folder Tree Mode** (`kind: "folderTree"` — the account's spaces, their
 * descendants, root and Recycle Bin), and with `descendants=false` or any
 * filter parameter present it returns **Folders Mode** (`kind: "folders"` —
 * only folders matching the filter). Setting `project` below always selects
 * Folders Mode.
 */
interface Input {
  title?: string;
  project?: boolean;
  descendants?: boolean;
  deleted?: boolean;
  pageSize?: number;
  nextPageToken?: string;
  rawParams?: unknown;
}

const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders & Projects",
  description: "List folders and projects in the current account.",
  params: [
    { key: "title", label: "Title contains", type: "string" },
    {
      key: "project",
      label: "Only projects",
      type: "boolean",
      hint: "On: only projects. Leave off to include plain folders too.",
    },
    {
      key: "descendants",
      label: "Include descendant folders",
      type: "boolean",
      hint: "Wrike defaults this to true. Set to false to select Folders Mode without a filter.",
    },
    { key: "deleted", label: "Include deleted (Recycle Bin)", type: "boolean", advanced: true },
    ...paginationParams(100),
    rawParamsParam,
  ],
  output: [
    { key: "kind", type: "string", label: '"folderTree" or "folders" — which mode ran' },
    { key: "items", type: "array", label: "Folders / projects" },
  ],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const body = await new WrikeClient(ctx, host).envelope("/folders", {
      query: {
        title: input.title,
        project: input.project,
        descendants: input.descendants,
        deleted: input.deleted,
        pageSize: input.pageSize,
        nextPageToken: input.nextPageToken,
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
    return { kind: body.kind, items: body.data ?? [] };
  },
};

export default folderList;
