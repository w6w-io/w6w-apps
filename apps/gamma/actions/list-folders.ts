import type { ActionDefinition } from "@w6w/types";
import { compact, GammaClient } from "../lib/client.ts";

/**
 * `GET /v1.0/folders` — verified against `workspace/list-folders.md`.
 * Cursor-paginated: pass a previous response's `nextCursor` as `after`.
 */
interface Input {
  query?: string;
  limit?: number;
  after?: string;
}

const listFolders: ActionDefinition<Input> = {
  key: "list-folders",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description:
    "List folders the authenticated user is a member of. Use a returned id as folderId when " +
    "generating into a specific folder.",
  params: [
    { key: "query", label: "Search Query", type: "string", hint: "Filter folders by name." },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1-50, default 20.",
      advanced: true,
    },
    {
      key: "after",
      label: "After Cursor",
      type: "string",
      hint: "From a previous response's nextCursor.",
      advanced: true,
    },
  ],
  output: [
    { key: "data", type: "array", label: "Folders — { id, name }" },
    { key: "hasMore", type: "boolean", label: "More results exist" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request("/folders", {
      query: compact({ query: input.query, limit: input.limit, after: input.after }),
    });
  },
};

export default listFolders;
