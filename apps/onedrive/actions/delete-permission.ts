import type { ActionDefinition } from "@w6w/types";
import { GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, ifMatchParam, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  permissionId: string;
  ifMatch?: string;
}

/**
 * `DELETE /me/drive/items/{item-id}/permissions/{perm-id}`
 *
 * https://learn.microsoft.com/en-us/graph/api/permission-delete
 *
 * Revokes one grant — a sharing link, or a person's access. Answers
 * `204 No Content`.
 *
 * The permission id comes from List Permissions or from the response of Create
 * Sharing Link. A grant that List Permissions showed with an `inheritedFrom`
 * reference does not live on this item and cannot be removed through it; delete
 * it on the ancestor the reference names.
 *
 * Deleting the permission behind a sharing link invalidates that link. Note it
 * does not necessarily invalidate an already-issued pre-authenticated download
 * URL immediately — the driveItem reference warns that "removing file
 * permissions for a user might not immediately invalidate the URL".
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const deletePermission: ActionDefinition<Input> = {
  key: "delete-permission",
  type: "perform",
  resource: "permission",
  title: "Delete Permission",
  description:
    "Revoke one sharing permission from a file or folder — a link, or a person's access.",
  // The end state is the same however many times it runs.
  idempotent: true,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "permissionId",
      label: "Permission ID",
      type: "string",
      required: true,
      hint:
        "From List Permissions, or from the `id` returned by Create Sharing Link. An inherited permission must be deleted on the ancestor it came from.",
    },
    ifMatchParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const path = requireItemPath(
      input,
      `/permissions/${encodeURIComponent(input.permissionId)}`,
    );
    return await client.status(path, {
      method: "DELETE",
      headers: input.ifMatch ? { "if-match": input.ifMatch } : undefined,
    });
  },
};

export default deletePermission;
