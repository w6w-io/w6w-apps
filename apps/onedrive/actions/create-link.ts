import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  type: string;
  scope?: string;
  password?: string;
  expirationDateTime?: string;
  retainInheritedPermissions?: boolean;
}

/**
 * `POST /me/drive/items/{item-id}/createLink`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-createlink
 *
 * Creates (or returns) a sharing link. Everything worth knowing is in how the
 * two enums interact, and the reference is precise about it:
 *
 *  - **`type`** is what the link lets you do: `view`, `edit`, or `embed` —
 *    and `embed` is "only available for files in OneDrive personal".
 *  - **`scope`** is who may use it: `anonymous` (no sign-in, and an administrator
 *    may have disabled it entirely), `organization` (any signed-in tenant member,
 *    "only available in OneDrive for Business and SharePoint"), or `users`.
 *    Omitting it takes the organization's default link type, which is *not*
 *    necessarily `anonymous`.
 *  - **`password`** is "Optional and OneDrive Personal only" — it is a `secret`
 *    param here so it is masked and encrypted at rest.
 *  - **`retainInheritedPermissions: false`** strips every existing permission the
 *    first time an item is shared. It defaults to `true` for good reason.
 *
 * Graph answers `201 Created` for a new link and `200 OK` when it hands back one
 * that already exists for the same parameters — which is what makes this action
 * safe to replay.
 *
 * Least privileged delegated permission: `Files.ReadWrite`. Permission
 * operations cost 5 resource units each against the SharePoint budget, the
 * priciest calls in this App.
 */
const createLink: ActionDefinition<Input> = {
  key: "create-link",
  type: "perform",
  resource: "permission",
  title: "Create Sharing Link",
  description:
    "Create a sharing link for a file or folder, or return the existing link for the same settings.",
  // Graph returns 200 with the pre-existing link when the same request is
  // repeated, so a replay does not multiply links.
  idempotent: true,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "type",
      label: "Link type",
      type: "select",
      required: true,
      default: "view",
      options: [
        { value: "view", label: "View — read-only" },
        { value: "edit", label: "Edit — read-write" },
        { value: "embed", label: "Embed — OneDrive personal only" },
      ],
    },
    {
      key: "scope",
      label: "Who can use it",
      type: "select",
      options: [
        { value: "anonymous", label: "Anyone with the link" },
        { value: "organization", label: "Anyone in the organization" },
        { value: "users", label: "Only the people you choose" },
      ],
      hint:
        "Leave empty to use the organization's default link type. `anonymous` may be disabled by an administrator; `organization` exists only on OneDrive for Business and SharePoint.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      advanced: true,
      hint: "Protects the link with a password. OneDrive personal only.",
    },
    {
      key: "expirationDateTime",
      label: "Expires at",
      type: "datetime",
      advanced: true,
      hint: "`yyyy-MM-ddTHH:mm:ssZ`. The link stops working after this instant.",
    },
    {
      key: "retainInheritedPermissions",
      label: "Retain inherited permissions",
      type: "boolean",
      default: true,
      advanced: true,
      hint:
        "Graph's default is `true`. Setting it `false` removes every existing permission the first time this item is shared.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Permission ID" },
    { key: "roles", type: "array", label: "Roles" },
    { key: "link", type: "object", label: "Sharing link" },
    { key: "expirationDateTime", type: "string", label: "Expires at" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(requireItemPath(input, "/createLink"), {
      method: "POST",
      body: compact({
        type: input.type,
        scope: input.scope || undefined,
        password: input.password || undefined,
        expirationDateTime: input.expirationDateTime || undefined,
        // Only sent when explicitly turned off; `true` is the service default.
        retainInheritedPermissions: input.retainInheritedPermissions === false ? false : undefined,
      }),
    });
  },
};

export default createLink;
