import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, folderIdParam } from "../lib/params.ts";

/**
 * `GET /me/projects/{project_id}` — one folder.
 *
 * `/me/projects/{project_id}` is the documented alias of
 * `GET /users/{user_id}/projects/{project_id}`, so the connection's numeric user
 * id is never needed. A missing folder is `404` with Vimeo error code 5000.
 */
interface Input {
  folderId: string;
  fields?: string;
}

const folderGet: ActionDefinition<Input> = {
  key: "folder-get",
  type: "read",
  resource: "folder",
  title: "Get Folder",
  description: "Fetch a single folder by ID.",
  params: [folderIdParam, fieldsParam],
  output: [
    { key: "uri", type: "string", label: "The folder's canonical URI" },
    { key: "name", type: "string", label: "Folder name" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/me/projects/${idFromRef(input.folderId, "Folder ID")}`,
      { query: { fields: toCsv(input.fields) } },
    );
  },
};

export default folderGet;
