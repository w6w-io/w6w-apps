import type { ActionDefinition } from "@w6w/types";
import { GraphClient, notebooksPath } from "../lib/client.ts";
import { displayNameParam, locationParams, notebookOutput } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  displayName: string;
}

/**
 * `POST /me/onenote/notebooks` · `POST /users/{id}/onenote/notebooks` ·
 * `POST /groups/{id}/onenote/notebooks` · `POST /sites/{id}/onenote/notebooks`
 *
 * https://learn.microsoft.com/en-us/graph/api/onenote-post-notebooks
 *
 * The `notebook` resource's own Methods table documents Get / Get recent /
 * Get from web / Create section(s) / List section(s) / Copy — no update, no
 * delete — so this App offers no rename/delete action for a notebook.
 *
 * Notebook names must be unique within the location and may not exceed 50
 * characters or contain `?* / :<>|'"` (no space in the real character set — split here only so this block comment can contain it).
 *
 * Least privileged delegated permission: `Notes.Create`. Returns `201
 * Created` and the new notebook object. Supported for both work-or-school and
 * personal Microsoft accounts.
 */
const createNotebook: ActionDefinition<Input> = {
  key: "create-notebook",
  type: "perform",
  resource: "notebook",
  title: "Create Notebook",
  description: "Create a new OneNote notebook.",
  // Every call mints a new notebook with a new id; Graph rejects a duplicate
  // name outright rather than converging on one, so a retry is not safe.
  idempotent: false,
  params: [
    ...locationParams(),
    displayNameParam(
      "The notebook's name. Must be unique in this location; up to 50 characters; cannot contain `?*/:<>|'\"`.",
    ),
  ],
  output: notebookOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(notebooksPath(input), {
      method: "POST",
      body: { displayName: input.displayName },
    });
  },
};

export default createNotebook;
