import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { folderIdParam, pageTokenParam } from "../lib/params.ts";

/**
 * `GET /api/v1/folders/{folderId}/items` — the Cards and sub-Folders that
 * live directly within a Folder (not recursively). Returns at most 50 per
 * call — page with `nextToken`.
 */
interface Input {
  folderId: string;
  cardDetail?: string;
  token?: string;
}

const folderItemsList: ActionDefinition<Input> = {
  key: "folder-items-list",
  type: "search",
  resource: "folder",
  title: "List Folder Items",
  description: "List the Cards and sub-Folders directly inside a Folder.",
  params: [
    folderIdParam,
    {
      key: "cardDetail",
      label: "Card detail",
      type: "select",
      options: [
        { value: "NONE", label: "None" },
        { value: "BASIC", label: "Basic (default)" },
        { value: "FULL", label: "Full" },
      ],
      hint: "How much detail to include for each Card item.",
    },
    pageTokenParam,
  ],
  output: [
    { key: "items", type: "array", label: "Folder items (Cards and sub-Folders)" },
    { key: "nextToken", type: "string", label: "Token for the next page, if any" },
  ],

  async execute(input, ctx) {
    const { items, nextToken } = await new GuruClient(ctx).page<Record<string, unknown>>(
      `/folders/${encodeURIComponent(input.folderId)}/items`,
      { query: { cardDetail: input.cardDetail, token: input.token } },
    );
    return { items: items.map(stripTokens), nextToken };
  },
};

export default folderItemsList;
