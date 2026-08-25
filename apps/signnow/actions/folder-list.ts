import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";

/**
 * `GET /user/folder` — the account's folder tree, rooted at the account's
 * top-level "Root" folder (its own documents plus its immediate subfolders).
 */
const folderList: ActionDefinition = {
  key: "folder-list",
  type: "read",
  resource: "folder",
  title: "List Folders",
  description: "Retrieve the account's folder tree.",
  output: [
    { key: "id", type: "string", label: "Root folder ID" },
    { key: "name", type: "string", label: "Root folder name" },
    { key: "folders", type: "array", label: "Subfolders" },
    { key: "total_documents", type: "number", label: "Total documents" },
  ],

  execute(_input, ctx) {
    return new SignNowClient(ctx).request("/user/folder");
  },
};

export default folderList;
