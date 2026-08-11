import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, folderIdParam } from "../lib/params.ts";

/**
 * `PATCH /me/projects/{project_id}` — rename a folder.
 *
 * Rename is the whole surface: `edit_project` documents exactly one body field,
 * `name`, and marks it **required**. There is no partial patch to make here, so
 * `name` is a required param rather than an optional one — sending an empty
 * body is a `400` with Vimeo error code 2205.
 *
 * `idempotent: true` — renaming to the same name twice is one rename.
 */
interface Input {
  folderId: string;
  name: string;
  fields?: string;
}

const folderUpdate: ActionDefinition<Input> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Rename Folder",
  description: "Rename a folder. Vimeo's folder edit endpoint accepts no other field.",
  idempotent: true,
  params: [
    folderIdParam,
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Rough cuts" },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The folder's canonical URI" },
    { key: "name", type: "string", label: "Folder name" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(
      `/me/projects/${idFromRef(input.folderId, "Folder ID")}`,
      { method: "PATCH", query: { fields: toCsv(input.fields) }, body: { name: input.name } },
    );
  },
};

export default folderUpdate;
