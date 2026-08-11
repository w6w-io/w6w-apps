import type { ActionDefinition } from "@w6w/types";
import { FormstackClient } from "../lib/client.ts";

/**
 * `GET /folders` — the account's folders and their subfolders.
 *
 * Formstack exposes a single level of nesting: a folder and its direct
 * subfolders, not an arbitrary tree.
 *
 * **This endpoint's pagination is `page` and `perPage`** — not the
 * `pageNumber`/`pageSize` that `/forms` and the submissions endpoints take. The
 * inconsistency is the vendor's, and sending the wrong pair is silently ignored
 * rather than rejected.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const folderList: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List the account's folders and their direct subfolders.",
  params: [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Starts at 1. This endpoint uses `page` — unlike List Forms, which uses `pageNumber`.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "This endpoint uses `perPage`, not `pageSize`.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Folders, each with its direct subfolders" }],

  execute(input, ctx) {
    return new FormstackClient(ctx).request("/folders", {
      query: { page: input.page, perPage: input.perPage },
    });
  },
};

export default folderList;
