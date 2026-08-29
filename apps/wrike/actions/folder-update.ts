import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import { rawParamsParam } from "../lib/params.ts";

/**
 * `PUT /folders/{folderId}` — update a folder/project.
 *
 * **A documented-schema oddity, deliberately not enforced here:** Wrike's own
 * OpenAPI definition for this one endpoint marks `withInvitations` as
 * `"required": true`, while the semantically identical flag on every other
 * endpoint in this app's surface (Update Task, Get Tasks By IDs, …) is
 * `"required": false`. Nothing about the flag's description ("Include
 * invitations in ownerIds & sharedIds list") reads as something that could be
 * mandatory, and forcing every folder update to pass it would degrade this
 * action for no confirmed benefit. Treated as optional; if Wrike's server
 * actually rejects its absence, that will surface as a normal
 * `parameter_required` error rather than a silent wrong behavior.
 */
interface Input {
  folderId: string;
  title?: string;
  description?: string;
  addParents?: string[] | string;
  removeParents?: string[] | string;
  addShareds?: string[] | string;
  removeShareds?: string[] | string;
  project?: unknown;
  restore?: boolean;
  rawParams?: unknown;
}

const folderUpdate: ActionDefinition<Input> = {
  key: "folder-update",
  type: "perform",
  resource: "folder",
  title: "Update Folder",
  description:
    "Update a folder/project's title, description, parents, sharing or project settings.",
  idempotent: true,
  params: [
    {
      key: "folderId",
      label: "Folder",
      type: "string",
      required: true,
    },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description (HTML)", type: "text" },
    { key: "addParents", label: "Add parent folder IDs", type: "string", advanced: true },
    { key: "removeParents", label: "Remove parent folder IDs", type: "string", advanced: true },
    { key: "addShareds", label: "Add share user IDs", type: "string" },
    { key: "removeShareds", label: "Remove share user IDs", type: "string", advanced: true },
    {
      key: "project",
      label: "Project settings (JSON)",
      type: "json",
      advanced: true,
      hint: 'e.g. {"status":"Completed"}.',
    },
    { key: "restore", label: "Restore from Recycle Bin", type: "boolean", advanced: true },
    rawParamsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    return new WrikeClient(ctx, host).one(`/folders/${encodeURIComponent(input.folderId)}`, {
      method: "PUT",
      query: {
        title: input.title,
        description: input.description,
        addParents: toList(input.addParents),
        removeParents: toList(input.removeParents),
        addShareds: toList(input.addShareds),
        removeShareds: toList(input.removeShareds),
        project: asOptionalJson(input.project, "Project settings"),
        restore: input.restore,
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
  },
};

export default folderUpdate;
