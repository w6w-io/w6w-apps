import type { ActionDefinition } from "@w6w/types";
import { compact, CompanyCamClient, encodeId, toList } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `POST /v2/projects/{project_id}/photos` — add a photo to a project **from a
 * URL**.
 *
 * This is the endpoint that makes CompanyCam usable from a sandboxed workflow
 * runtime at all. The body is ordinary JSON carrying `uri`, a URL CompanyCam
 * fetches itself — there is no multipart upload, no raw file part, and nothing
 * binary crosses the wire from here. (The document endpoint is different: see
 * `project-document-create.ts`, which takes base64 text.)
 *
 * Consequences worth knowing before wiring this into a workflow:
 *
 *  - **The URL must be reachable by CompanyCam**, not by w6w. A pre-signed S3
 *    link works; a link behind your VPN does not, and the failure surfaces
 *    later as a photo stuck in `processing_error`, not as an error here.
 *  - **`captured_at` is required and is a Unix timestamp in seconds.** It is
 *    when the photo was taken, not when it was uploaded, and it is what every
 *    date filter in this API sorts and filters on. Passing milliseconds puts
 *    the photo somewhere in the year 56000.
 *  - **Ingestion is asynchronous.** The response is `201` with
 *    `processing_status: "pending"`; the photo is not viewable until that
 *    reaches `processed`. Poll `photo-get` or subscribe to the `photo.created`
 *    webhook.
 *
 * Not idempotent: there is no idempotency key in this API, and a retry uploads
 * the same photo a second time.
 *
 * `tags` and `description` are both documented on this body — tags in the
 * vendor's "Add tags when uploading a photo to a project" changelog, description
 * in the OpenAPI schema. `internal` appears in the vendor's photo-description
 * changelog example but **not** in the OpenAPI request schema; it is offered
 * here because that example is the vendor's own, and `photo-update` sets the
 * same flag on an existing photo if it turns out to be ignored on create.
 */
interface Input {
  projectId: string;
  uri: string;
  capturedAt: number;
  description?: string;
  tags?: string[] | string;
  lat?: number;
  lon?: number;
  internal?: boolean;
  actAs?: string;
}

const projectPhotoCreate: ActionDefinition<Input> = {
  key: "project-photo-create",
  type: "perform",
  resource: "photo",
  title: "Add Photo to Project",
  description:
    "Add a photo to a project from a publicly reachable URL. CompanyCam fetches and processes " +
    "it asynchronously.",
  idempotent: false,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
    {
      key: "uri",
      label: "Photo URL",
      type: "string",
      required: true,
      hint: "CompanyCam fetches this URL itself, so it must be reachable from the public " +
        "internet — a pre-signed link is fine, an internal one is not.",
    },
    {
      key: "capturedAt",
      label: "Captured at",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "Unix timestamp in SECONDS, when the photo was taken. Every date filter in this " +
        "API works off this value, not the upload time.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Plain text, or HTML limited to a, strong, b, em, i, ol, ul, li, p, br and div.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      repeat: true,
      hint: "Tag display values. Comma-separated is accepted too.",
    },
    { key: "lat", label: "Latitude", type: "number", row: "coords", advanced: true },
    { key: "lon", label: "Longitude", type: "number", row: "coords", advanced: true },
    {
      key: "internal",
      label: "Internal only",
      type: "boolean",
      advanced: true,
      hint: "Marks the photo as not for marketing use. Documented in the vendor's changelog " +
        "example rather than in the OpenAPI schema.",
    },
    actAsParam,
  ],
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "processing_status", type: "string", label: "Processing status" },
    { key: "uris", type: "array", label: "Image variants" },
    { key: "photo_url", type: "string", label: "Photo URL" },
  ],

  execute(input, ctx) {
    const photo = compact({
      uri: input.uri,
      captured_at: input.capturedAt,
      description: input.description,
      tags: toList(input.tags),
      coordinates: input.lat !== undefined && input.lon !== undefined
        ? { lat: input.lat, lon: input.lon }
        : undefined,
      internal: input.internal,
    });

    return new CompanyCamClient(ctx).json(`/projects/${encodeId(input.projectId)}/photos`, {
      method: "POST",
      body: { photo },
      actAs: input.actAs,
    });
  },
};

export default projectPhotoCreate;
