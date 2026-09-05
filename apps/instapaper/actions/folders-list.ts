import type { ActionDefinition } from "@w6w/types";
import { InstapaperClient, type InstapaperFolder } from "../lib/client.ts";

/**
 * `POST /api/1/folders/list` — the account's user-created, organizational
 * folders only. The docs are explicit this excludes RSS-feed folders and
 * starred-subscription folders.
 */
const foldersList: ActionDefinition<Record<string, never>> = {
  key: "folders-list",
  type: "read",
  resource: "folder",
  title: "List Folders",
  description: "List the account's user-created folders.",
  output: [{ key: "folders", type: "array", label: "Folders" }],

  async execute(_input, ctx) {
    const folders = await new InstapaperClient(ctx).call<InstapaperFolder>("/api/1/folders/list");
    return { folders };
  },
};

export default foldersList;
