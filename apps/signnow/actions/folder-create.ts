import type { ActionDefinition } from "@w6w/types";
import { compact, SignNowClient } from "../lib/client.ts";

interface Input {
  name: string;
  parentId: string;
}

/**
 * `POST /user/folder` — creates a folder. SignNow documents both `name` and
 * `parent_id` as required — use `folder-list`'s root folder id as the parent
 * to create a top-level folder.
 */
const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder inside another folder.",
  idempotent: false,
  params: [
    { key: "name", label: "Folder Name", type: "string", required: true },
    {
      key: "parentId",
      label: "Parent Folder ID",
      type: "string",
      required: true,
      hint: "From List Folders — use the root folder's id for a top-level folder.",
    },
  ],
  output: [{ key: "id", type: "string", label: "New folder ID" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request("/user/folder", {
      method: "POST",
      body: compact({ name: input.name, parent_id: input.parentId }),
    });
  },
};

export default folderCreate;
