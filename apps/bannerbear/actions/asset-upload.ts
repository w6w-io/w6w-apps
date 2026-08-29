import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient, base64ToBytes } from "../lib/client.ts";

interface Asset {
  uid: string;
  url: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
}

interface Input {
  file: string;
  contentType: string;
}

/**
 * `POST /assets` — the one endpoint whose request body is raw bytes, not
 * JSON: the Content-Type header IS the payload's own type, from the fixed
 * list the OpenAPI document enumerates (verified 2026-08-29, no
 * `application/octet-stream` catch-all is accepted — an unlisted type 415s).
 *
 * Bannerbear de-duplicates by content hash: uploading the same bytes twice
 * returns the SAME asset record (`200`) instead of creating a second one
 * (`201`), which is why this action is idempotent despite being a raw upload.
 */
const action: ActionDefinition<Input, Asset> = {
  key: "asset-upload",
  type: "perform",
  resource: "asset",
  title: "Upload Asset",
  description:
    "Upload an image, video, audio, or PDF file (as base64) to use as a source in a template " +
    "modification. Idempotent: Bannerbear matches by content hash, so uploading the same bytes " +
    "twice returns the existing asset rather than creating a duplicate.",
  idempotent: true,
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents, or a data: URI — a workflow cannot attach bytes it " +
        "never had.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "select",
      required: true,
      options: [
        { value: "image/jpeg", label: "JPEG image" },
        { value: "image/png", label: "PNG image" },
        { value: "image/webp", label: "WebP image" },
        { value: "image/gif", label: "GIF image" },
        { value: "video/mp4", label: "MP4 video" },
        { value: "video/webm", label: "WebM video" },
        { value: "video/quicktime", label: "QuickTime video" },
        { value: "audio/mpeg", label: "MP3 audio" },
        { value: "audio/wav", label: "WAV audio" },
        { value: "audio/mp4", label: "M4A audio" },
        { value: "audio/webm", label: "WebM audio" },
        { value: "audio/ogg", label: "OGG audio" },
        { value: "application/pdf", label: "PDF" },
      ],
      hint: "Must match the file's real type — an unlisted or mismatched type is refused (415).",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "url", type: "string", label: "CDN URL" },
  ],

  async execute(input, ctx) {
    const file = String(input.file ?? "").trim();
    const contentType = String(input.contentType ?? "").trim();
    if (!file) throw new Error("`file` is required");
    if (!contentType) throw new Error("`contentType` is required");

    return await new BannerbearClient(ctx).uploadAsset<Asset>(base64ToBytes(file), contentType);
  },
};

export default action;
