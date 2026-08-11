import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `POST /v2/photos/{photo_id}/descriptions` — set a photo's description.
 *
 * A `POST` to a plural path that sets a single scalar field, with a flat body
 * (`{"description": "…"}` — no `photo` wrapper, unlike `photo-update`) and a
 * `Photo` in the response. The vendor's own operation id is
 * `updatePhotoDescription`, which is what it is: writing the same text twice
 * leaves the same text, so this is marked idempotent despite the verb.
 *
 * **HTML is allowed, from a fixed tag list.** The vendor permits `a`, `strong`,
 * `b`, `em`, `i`, `ol`, `ul`, `li`, `p`, `br` and `div`. Anything else is
 * outside what they document, so a workflow pasting arbitrary rich text should
 * expect it to be stripped or rejected.
 */
interface Input {
  photoId: string;
  description: string;
}

const photoDescriptionUpdate: ActionDefinition<Input> = {
  key: "photo-description-update",
  type: "perform",
  resource: "photo",
  title: "Update Photo Description",
  description: "Replace a photo's description. Plain text, or HTML from the vendor's tag list.",
  idempotent: true,
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      hint: "Plain text, or HTML limited to a, strong, b, em, i, ol, ul, li, p, br and div.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Photo ID" },
    { key: "description", type: "string", label: "Description" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/photos/${encodeId(input.photoId)}/descriptions`, {
      method: "POST",
      body: { description: input.description },
    });
  },
};

export default photoDescriptionUpdate;
