import type { ActionDefinition } from "@w6w/types";
import { type FileUploadResponse, ManusClient } from "../lib/client.ts";

interface Input {
  filename: string;
}

/**
 * `POST /v2/file.upload` — create a file record and get back a presigned S3
 * `upload_url`. This action does NOT upload the bytes itself: the presigned
 * URL points at a per-request, vendor-controlled storage host that cannot be
 * named in advance, so it cannot be declared in `w6w.network.allow` the way
 * every other host this app calls can (the same reasoning this pack's
 * `devin` app documents for its own attachment download URLs). A workflow
 * needs to `PUT` the file's bytes to `upload_url` itself — via an HTTP action
 * built for an arbitrary caller-supplied URL — within the 3-minute expiry,
 * before passing `file.id` as `fileId` to `task-create`/`task-send-message`.
 *
 * `idempotent: false`: every call creates a new file record and a fresh
 * presigned URL, whether or not the same filename was just used.
 */
const fileUpload: ActionDefinition<Input, FileUploadResponse> = {
  key: "file-upload",
  type: "perform",
  resource: "file",
  title: "Create File Upload",
  description: "Create a file record and get a presigned URL to upload its bytes to.",
  idempotent: false,
  params: [
    {
      key: "filename",
      label: "File name",
      type: "string",
      required: true,
      hint: "Including extension, e.g. report.pdf — helps Manus determine the file type.",
    },
  ],
  output: [
    { key: "file", type: "object", label: "File record (id, filename, status, created_at)" },
    { key: "upload_url", type: "string", label: "Presigned URL — PUT the file bytes here" },
    { key: "upload_expires_at", type: "number", label: "Unix seconds — upload_url expires then" },
  ],

  execute(input, ctx) {
    return new ManusClient(ctx).request<FileUploadResponse>("/v2/file.upload", {
      method: "POST",
      body: { filename: input.filename },
    });
  },
};

export default fileUpload;
