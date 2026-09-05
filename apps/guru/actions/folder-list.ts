import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens, toList } from "../lib/client.ts";
import { pageTokenParam } from "../lib/params.ts";

/**
 * `GET /api/v1/folders` — every undeleted Folder the credential can access.
 * Guru's UI calls these "Boards". Returns at most 110 per call — page with
 * `nextToken`.
 */
interface Input {
  sortField?: string;
  sortOrder?: string;
  q?: string;
  search?: string;
  collectionId?: string;
  folderIds?: string[] | string;
  legacyTypes?: string[] | string;
  token?: string;
}

const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: 'List Folders ("Boards" in Guru\'s UI) the connected account can access.',
  params: [
    { key: "q", label: "Query", type: "string" },
    { key: "search", label: "Search", type: "string" },
    {
      key: "collectionId",
      label: "Collection ID",
      type: "string",
      hint: "Restrict to one Collection.",
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: [{ value: "title", label: "Title" }, {
        value: "lastModified",
        label: "Last modified",
      }],
      advanced: true,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "ASC", label: "Ascending" }, { value: "DESC", label: "Descending" }],
      advanced: true,
    },
    {
      key: "folderIds",
      label: "Folder IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated Folder IDs, to look up several by ID in one call.",
    },
    {
      key: "legacyTypes",
      label: "Legacy types",
      type: "multiselect",
      options: [
        { value: "BOARD_GROUP", label: "Board group" },
        { value: "BOARD", label: "Board" },
        { value: "SECTION", label: "Section" },
      ],
      advanced: true,
    },
    pageTokenParam,
  ],
  output: [
    { key: "items", type: "array", label: "Folders" },
    { key: "nextToken", type: "string", label: "Token for the next page, if any" },
  ],

  async execute(input, ctx) {
    const { items, nextToken } = await new GuruClient(ctx).page<Record<string, unknown>>(
      "/folders",
      {
        query: {
          q: input.q,
          search: input.search,
          collection: input.collectionId,
          sortField: input.sortField,
          sortOrder: input.sortOrder,
          folderIds: toList(input.folderIds)?.join(","),
          legacyTypes: toList(input.legacyTypes)?.join(","),
          token: input.token,
        },
      },
    );
    return { items: items.map(stripTokens), nextToken };
  },
};

export default folderList;
