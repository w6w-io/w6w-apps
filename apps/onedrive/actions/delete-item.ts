import type { ActionDefinition } from "@w6w/types";
import { GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, ifMatchParam, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  ifMatch?: string;
  bypassSharedLock?: boolean;
  bypassCheckedOut?: boolean;
}

/**
 * `DELETE /me/drive/items/{item-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-delete
 *
 * Answers `204 No Content` and no body. Deleting a **folder deletes everything
 * inside it**, and the item goes to the drive's recycle bin rather than
 * vanishing — its bytes still count against the `deleted` figure in the quota
 * facet until the bin is emptied, which is worth knowing when a delete is meant
 * to free space.
 *
 * The two `prefer` values are the documented escape hatches for the failure
 * everyone hits on a business drive: a file someone has open in a coauthoring
 * session, or one checked out in SharePoint. Both are off by default because
 * bypassing another person's lock should be a decision, not a default.
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const deleteItem: ActionDefinition<Input> = {
  key: "delete-item",
  type: "perform",
  resource: "item",
  title: "Delete Item",
  description:
    "Delete a file or folder, moving it to the recycle bin. Deleting a folder deletes its contents.",
  // The end state is the same however many times it runs; a replay against an
  // already-deleted item is a 404, not a second deletion.
  idempotent: true,
  params: [
    driveIdParam,
    ...itemParams(),
    ifMatchParam,
    {
      key: "bypassSharedLock",
      label: "Bypass shared lock",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Sends `prefer: bypass-shared-lock`, overriding a lock held by an active coauthoring session.",
    },
    {
      key: "bypassCheckedOut",
      label: "Bypass check-out",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Sends `prefer: bypass-checked-out`, overriding a SharePoint check-out.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const prefer = [
      input.bypassSharedLock ? "bypass-shared-lock" : undefined,
      input.bypassCheckedOut ? "bypass-checked-out" : undefined,
    ].filter(Boolean).join(", ");
    const headers: Record<string, string> = {};
    if (input.ifMatch) headers["if-match"] = input.ifMatch;
    // The reference allows multiple comma-separated values in one header.
    if (prefer) headers["prefer"] = prefer;

    return await client.status(requireItemPath(input), {
      method: "DELETE",
      headers: Object.keys(headers).length ? headers : undefined,
    });
  },
};

export default deleteItem;
