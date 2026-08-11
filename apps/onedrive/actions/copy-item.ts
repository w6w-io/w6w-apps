import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, requireItemPath } from "../lib/client.ts";
import { conflictBehaviorParam, driveIdParam, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  targetDriveId?: string;
  targetFolderId?: string;
  name?: string;
  childrenOnly?: boolean;
  includeAllVersionHistory?: boolean;
  conflictBehavior?: string;
}

/**
 * `POST /me/drive/items/{item-id}/copy`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-copy
 *
 * The only asynchronous call in this App, and the shape catches people out:
 *
 *  - It answers **`202 Accepted` with an empty body** and a `Location` header
 *    pointing at a monitor endpoint. Nothing is copied yet when the call
 *    returns, and there is no new item id to hand downstream.
 *  - That monitor URL lives on the **tenant's own SharePoint host**
 *    (`https://contoso.sharepoint.com/_api/v2.0/monitor/…`), not on
 *    `graph.microsoft.com`. Per-tenant hostnames cannot be enumerated in
 *    `w6w.network.allow`, so this action returns the URL and does not poll it.
 *    A workflow that needs to wait can poll for the copy's arrival with List
 *    Children or Get Item instead.
 *  - **`parentReference` wants `driveId` *and* `id`** — the reference says so
 *    explicitly. Passing only the folder id works within the same drive and is
 *    the common case, but a cross-drive copy needs both.
 *  - `@microsoft.graph.conflictBehavior` is documented here as a **query
 *    parameter**, unlike Create Folder where the same annotation rides in the
 *    body — this action follows each endpoint's own page. The reference also
 *    notes it "isn't supported for OneDrive Consumer".
 *
 * Least privileged delegated permission: `Files.ReadWrite`.
 */
const copyItem: ActionDefinition<Input> = {
  key: "copy-item",
  type: "perform",
  resource: "item",
  title: "Copy Item",
  description:
    "Start an asynchronous copy of a file or folder. Returns 202 and the monitor URL; the copy is not finished when this action returns.",
  // Each run enqueues another copy: with the default `fail` behaviour the
  // second one errors, with `rename` it produces a duplicate. Neither is a
  // safe replay.
  idempotent: false,
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "targetDriveId",
      label: "Target drive ID",
      type: "string",
      hint:
        "`parentReference.driveId` of the destination. The reference asks for it alongside the folder id; required for a copy into a different drive.",
    },
    {
      key: "targetFolderId",
      label: "Target folder ID",
      type: "string",
      hint:
        "`parentReference.id` of the destination folder. Leave both target fields empty to copy alongside the original.",
    },
    {
      key: "name",
      label: "New name",
      type: "string",
      hint: "Name for the copy. Defaults to the original's name.",
    },
    {
      key: "childrenOnly",
      label: "Copy contents only",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Copy a folder's children without the folder itself. Valid only on folder items.",
    },
    {
      key: "includeAllVersionHistory",
      label: "Include version history",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Copy the source file's major (and minor) versions, not just the latest.",
    },
    conflictBehaviorParam(
      "Sent as the `@microsoft.graph.conflictBehavior` **query parameter**, as this endpoint's reference documents. Not supported on OneDrive Consumer. `replace` applies to files only; a conflicting folder falls back to `fail`.",
    ),
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "monitorUrl", type: "string", label: "Monitor URL" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const parentReference = compact({
      driveId: input.targetDriveId || undefined,
      id: input.targetFolderId || undefined,
    });
    return await client.accepted(requireItemPath(input, "/copy"), {
      method: "POST",
      query: { "@microsoft.graph.conflictBehavior": input.conflictBehavior },
      body: compact({
        parentReference: Object.keys(parentReference).length ? parentReference : undefined,
        name: input.name || undefined,
        childrenOnly: input.childrenOnly ? true : undefined,
        includeAllVersionHistory: input.includeAllVersionHistory ? true : undefined,
      }),
    });
  },
};

export default copyItem;
