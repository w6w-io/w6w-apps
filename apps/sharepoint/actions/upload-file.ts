import type { ActionDefinition } from "@w6w/types";
import { childPath, GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemOutput, itemParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  name?: string;
  content: string;
  contentType?: string;
}

/**
 * `PUT {drive}/items/{parent-id}:/{filename}:/content` — or
 * `PUT {drive}/items/{item-id}/content` to replace a file in place.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
 *
 * The simple upload. Two limits, one of them Microsoft's and one of them
 * ours:
 *
 *  - **Microsoft's:** "This method only supports files up to 250 MB in size."
 *    Anything larger needs a resumable *upload session*, which is out of scope
 *    for this App — see the README.
 *  - **Ours: the content is text.** A w6w action runs in a sandboxed worker and
 *    its `ctx.fetch` request body is stringified on the way to the host
 *    (`core/packages/runtime/src/sandbox/worker.ts`), so bytes above U+007F
 *    cannot survive the crossing intact. Passing base64 here would upload the
 *    *base64* as the file contents, which is worse than refusing, so binary
 *    upload is deliberately not offered.
 *
 * Addressing follows the endpoint's three documented forms: give a **File
 * name** and the addressed item is the *parent folder*; leave it empty and the
 * addressed item is the file being replaced.
 *
 * Least privileged delegated permission: `Files.ReadWrite`; `Sites.ReadWrite.All`
 * is documented as a valid higher alternative and is the one this App
 * requests. Returns the created or updated driveItem (`201` for a new file,
 * `200` for a replacement).
 */
const uploadFile: ActionDefinition<Input> = {
  key: "upload-file",
  type: "perform",
  resource: "drive-item",
  title: "Upload File",
  description:
    "Upload text content as a new file, or replace an existing file's contents, in a single request. Up to 250 MB; text only.",
  // The driveItem reference states the conflict behaviour for a PUT is
  // `replace`, so re-running with the same target and the same content lands on
  // the same end state rather than minting a second file.
  idempotent: true,
  params: [
    ...siteParams(),
    driveIdParam,
    ...itemParams({ rootMeans: "the library's root folder as the parent" }),
    {
      key: "name",
      label: "File name",
      type: "string",
      placeholder: "notes.txt",
      hint:
        "Name of the file to create inside the addressed folder. Leave empty to replace the addressed item's own contents instead. Must not contain `/`.",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint:
        "The file's contents, as text. Binary uploads are not supported: the sandbox hands request bodies to the host as text, so bytes would not survive intact.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "text/plain",
      advanced: true,
      placeholder: "text/csv",
      hint:
        "The `Content-Type` header stored with the file and served back on download. The reference's example uses `text/plain`.",
    },
  ],
  output: itemOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const target = input.name?.trim()
      ? childPath(input, input.name, "/content")
      : requireItemPath(input, "/content");
    ctx.log("info", "uploading file", { path: target, bytes: input.content?.length ?? 0 });
    return await client.text(target, input.content ?? "", input.contentType || "text/plain");
  },
};

export default uploadFile;
