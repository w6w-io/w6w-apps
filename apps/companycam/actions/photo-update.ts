import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `PUT /v2/photos/{id}` — set a photo's `internal` flag.
 *
 * That is the entire documented body: `{"photo": {"internal": true|false}}`.
 * The description is changed through a different endpoint
 * (`photo-description-update`), and nothing here moves a photo between
 * projects or edits its capture time.
 *
 * `internal` marks a photo as not for marketing or other public material. The
 * documented success status is `201`, on an endpoint that creates nothing.
 *
 * Idempotent: it sets a boolean to a stated value.
 */
interface Input {
  photoId: string;
  internal: boolean;
}

const photoUpdate: ActionDefinition<Input> = {
  key: "photo-update",
  type: "perform",
  resource: "photo",
  title: "Update Photo",
  description:
    "Set a photo's internal-only flag. This endpoint changes nothing else — use Update Photo " +
    "Description for the text.",
  idempotent: true,
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    {
      key: "internal",
      label: "Internal only",
      type: "boolean",
      required: true,
      hint: "True marks the photo as not for marketing or other public use.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "internal", type: "boolean", label: "Internal only" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/photos/${encodeId(input.photoId)}`, {
      method: "PUT",
      body: { photo: { internal: input.internal } },
    });
  },
};

export default photoUpdate;
