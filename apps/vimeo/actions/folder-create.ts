import type { ActionDefinition } from "@w6w/types";
import { compact, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `POST /me/projects` — create a folder.
 *
 * `name` is the only required field. Passing `parent_folder_uri` makes it a
 * subfolder — Vimeo's own words: "By default, this method creates a top-level
 * folder. To create a subfolder … specify the parent folder by URI with the
 * **parent_folder_uri** parameter." It wants the full folder URI, not an id,
 * which is why the param is spelled URI and hinted with the shape.
 *
 * Answers `201`. Failure modes worth naming: `403` error code 3200 (this
 * account cannot create folders — a plan limit, not a scope problem) and `403`
 * error code 3701 (maximum folder depth exceeded).
 *
 * `idempotent: false`: there is no idempotency key and no uniqueness constraint
 * on the name, so a retry creates a second folder with the same name.
 */
interface Input {
  name: string;
  parentFolderUri?: string;
  fields?: string;
}

const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder, optionally nested inside an existing one.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Rough cuts" },
    {
      key: "parentFolderUri",
      label: "Parent folder URI",
      type: "string",
      placeholder: "/users/152184/projects/6789",
      hint: "Full folder URI, not an ID. Leave blank for a top-level folder. Vimeo enforces a " +
        "maximum nesting depth and refuses with error code 3701 beyond it.",
    },
    fieldsParam,
  ],
  output: [
    { key: "uri", type: "string", label: "The new folder's URI" },
    { key: "name", type: "string", label: "Folder name" },
  ],

  execute(input, ctx) {
    return new VimeoClient(ctx).request("/me/projects", {
      method: "POST",
      query: { fields: toCsv(input.fields) },
      body: compact({ name: input.name, parent_folder_uri: input.parentFolderUri }),
    });
  },
};

export default folderCreate;
