import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/photos/{id}` — one photo.
 *
 * Two fields do the work here:
 *
 *  - **`processing_status`** — `pending`, `processing`, `processed`,
 *    `processing_error` or `duplicate`. A photo added from a URL is `pending`
 *    when the create call returns, so this is the endpoint a workflow polls.
 *    `duplicate` is its own outcome: CompanyCam recognised the image and did
 *    not store a second copy.
 *  - **`uris`** — an array of variants (`original`, `web`, `thumbnail`), each
 *    with both `uri` and `url`. There is no single "the URL" field; pick the
 *    variant you want by `type`.
 */
interface Input {
  photoId: string;
}

const photoGet: ActionDefinition<Input> = {
  key: "photo-get",
  type: "read",
  resource: "photo",
  title: "Retrieve Photo",
  description: "Fetch one photo, including its processing status and its image variants.",
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "processing_status", type: "string", label: "Processing status" },
    { key: "description", type: "string", label: "Description" },
    { key: "internal", type: "boolean", label: "Internal only" },
    { key: "uris", type: "array", label: "Image variants" },
    { key: "captured_at", type: "number", label: "Captured at (Unix seconds)" },
    { key: "photo_url", type: "string", label: "Photo URL" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/photos/${encodeId(input.photoId)}`);
  },
};

export default photoGet;
