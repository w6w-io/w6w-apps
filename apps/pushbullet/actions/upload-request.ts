import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/upload-request` — request authorization to upload a file, the
 * first half of pushing a file (see `push-create.ts`) or attaching a picture
 * to a text (see `text-create.ts`).
 *
 * ## This action deliberately stops at the authorization step
 *
 * The vendor's flow has a second step this app does not perform: POST the
 * file's bytes as `multipart/form-data` to the `uploadUrl` this action
 * returns. That destination is returned **per call** by Pushbullet and is not
 * declared anywhere in advance — the docs' own example
 * (`https://upload.pushbullet.com/upload-legacy/<id>`) is one observed value,
 * not a documented, stable host this app could put in `network.allow` ahead
 * of time. Rather than widen egress to `"*"` (appropriate only for a
 * user-supplied URL, per the house network-allow convention) to cover a host
 * the vendor does not commit to, this action returns `uploadUrl` and lets the
 * workflow's own HTTP step perform that upload — the same shape SendGrid's
 * "upload an attachment" split takes in other apps in this pack.
 */
interface Input {
  fileName: string;
  fileType: string;
}

const uploadRequest: ActionDefinition<Input> = {
  key: "upload-request",
  type: "perform",
  resource: "upload",
  title: "Request File Upload",
  description: "Request an authorized URL to upload a file to. POST the file's bytes as " +
    "multipart/form-data to the returned upload URL yourself, then use the returned file URL " +
    "in Create Push or Send Text.",
  idempotent: false,
  params: [
    { key: "fileName", label: "File name", type: "string", required: true },
    { key: "fileType", label: "File MIME type", type: "string", required: true },
  ],
  output: [
    { key: "fileName", type: "string", label: "File name to use" },
    { key: "fileType", type: "string", label: "File type to use" },
    { key: "fileUrl", type: "string", label: "URL the file will be available at once uploaded" },
    {
      key: "uploadUrl",
      type: "string",
      label: "URL to POST the file bytes to (multipart/form-data)",
    },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<Record<string, unknown>>("/upload-request", {
      method: "POST",
      body: { file_name: input.fileName, file_type: input.fileType },
    });
    return {
      fileName: body.file_name,
      fileType: body.file_type,
      fileUrl: body.file_url,
      uploadUrl: body.upload_url,
    };
  },
};

export default uploadRequest;
