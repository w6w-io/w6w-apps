import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/documents` — attach a document to a project.
 *
 * **Base64 in a JSON field, not multipart.** The body is
 * `{"document": {"name": "…", "attachment": "<base64>"}}` and the vendor's own
 * example is `"VGVzdAo="`. That is what makes this reachable from a sandboxed
 * runtime at all: the request carries text, never bytes.
 *
 * The 30 MB limit the vendor documents is on the **file**, and base64 inflates
 * by about a third, so the JSON body for a 30 MB file is roughly 40 MB of
 * string. Encoding it is the caller's job — this action takes the base64 text
 * as given and does not try to fetch or encode anything.
 *
 * `name` is what appears in CompanyCam, and its extension is what the app uses
 * to decide how to render the file; the response's `content_type` is derived
 * server-side.
 *
 * Not idempotent: a retry attaches a second copy.
 */
interface Input {
  projectId: string;
  name: string;
  attachment: string;
  actAs?: string;
}

const projectDocumentCreate: ActionDefinition<Input> = {
  key: "project-document-create",
  type: "perform",
  resource: "document",
  title: "Upload Project Document",
  description:
    "Attach a document to a project. The file is sent as base64 text in JSON, with a 30 MB " +
    "limit on the decoded file.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "name",
      label: "File name",
      type: "string",
      required: true,
      placeholder: "measurements.pdf",
      hint: "Include the extension — it is what CompanyCam renders the document by.",
    },
    {
      key: "attachment",
      label: "File contents (base64)",
      type: "text",
      required: true,
      hint: "Base64 of the file, no data: prefix. The decoded file must be under 30 MB; the " +
        "base64 text is about a third larger.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "url", type: "string", label: "Download URL" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "byte_size", type: "number", label: "Size in bytes" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/documents`, {
      method: "POST",
      body: { document: { name: input.name, attachment: input.attachment } },
      actAs: input.actAs,
    });
  },
};

export default projectDocumentCreate;
