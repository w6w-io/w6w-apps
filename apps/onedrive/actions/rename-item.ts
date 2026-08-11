import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, ifMatchParam, itemOutput, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  name: string;
  description?: string;
  ifMatch?: string;
}

/**
 * `PATCH /me/drive/items/{item-id}` with a new `name`.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-update
 *
 * The same endpoint Move Item uses — Graph has one update verb for driveItems
 * and the request body decides what changed. Kept as its own action because
 * "rename this" and "move this" are different intentions, and a single action
 * requiring a destination folder to perform a rename would be worse.
 *
 * `description` is writable on OneDrive personal; on OneDrive for Business and
 * SharePoint-backed drives it is not exposed on the driveItem, so it is optional
 * and advanced rather than a headline field.
 *
 * Renaming by **path** and renaming by **id** both work, but a path is stale the
 * instant the rename succeeds — anything downstream should use the returned id.
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const renameItem: ActionDefinition<Input> = {
  key: "rename-item",
  type: "perform",
  resource: "item",
  title: "Rename Item",
  description: "Rename a file or folder in place.",
  // Sets a property to a fixed value; a replay writes the same value again.
  idempotent: true,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "name",
      label: "New name",
      type: "string",
      required: true,
      placeholder: "Q3 report (final).pdf",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      advanced: true,
      hint:
        "driveItem `description`. Writable on OneDrive personal; not surfaced on OneDrive for Business or SharePoint-backed drives.",
    },
    ifMatchParam,
  ],
  output: itemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(requireItemPath(input), {
      method: "PATCH",
      headers: input.ifMatch ? { "if-match": input.ifMatch } : undefined,
      // Only what changed: the reference asks callers not to resend unchanged
      // properties.
      body: compact({
        name: input.name,
        description: input.description || undefined,
      }),
    });
  },
};

export default renameItem;
