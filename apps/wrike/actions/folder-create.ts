import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import { rawParamsParam } from "../lib/params.ts";

/**
 * `POST /folders/{folderId}/folders` — create a folder within another folder.
 * Pass a `project` object to create it as a **project** instead of a plain
 * folder (Wrike's `FolderProjectCreateParam` shape:
 * `{"ownerIds":[...],"status":"Green","startDate":"...","endDate":"..."}`).
 *
 * Not idempotent: Wrike documents no idempotency key for this endpoint.
 */
interface Input {
  folderId: string;
  title: string;
  description?: string;
  shareds?: string[] | string;
  project?: unknown;
  rawParams?: unknown;
}

const folderCreate: ActionDefinition<Input> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder — or a project, when `project` is set — within another folder.",
  idempotent: false,
  params: [
    {
      key: "folderId",
      label: "Parent folder",
      type: "string",
      required: true,
      hint: "Use the virtual root folder ID (see Get Account) to create at the account root.",
    },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description (HTML)", type: "text" },
    {
      key: "shareds",
      label: "Share with user IDs",
      type: "string",
      hint: "Comma-separated Wrike user IDs.",
    },
    {
      key: "project",
      label: "Project settings (JSON)",
      type: "json",
      advanced: true,
      hint: 'Set to create a PROJECT instead of a plain folder, e.g. {"status":"Green"}. Wrike ' +
        "ProjectStatus enum: Green, Yellow, Red, OnHold, Completed, Cancelled, Custom.",
    },
    rawParamsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Folder ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "scope", type: "string", label: "Tree scope (e.g. WsFolder)" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    ctx.log("info", "creating Wrike folder", { folderId: input.folderId, title: input.title });
    return new WrikeClient(ctx, host).one(
      `/folders/${encodeURIComponent(input.folderId)}/folders`,
      {
        method: "POST",
        query: {
          title: input.title,
          description: input.description,
          shareds: toList(input.shareds),
          project: asOptionalJson(input.project, "Project settings"),
          ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
        },
      },
    );
  },
};

export default folderCreate;
