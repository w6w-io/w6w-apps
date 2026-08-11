import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId, toList } from "../lib/client.ts";

/**
 * `POST /v2/photos/{photo_id}/tags` — tag a photo.
 *
 * The body is `{"tags": ["…"]}` — a flat array of **display values, not ids**,
 * unlike the project-label endpoint which nests the same idea under
 * `{"project": {"labels": […]}}`. A value that does not exist yet is created,
 * so a typo permanently adds a tag to the company's vocabulary.
 *
 * Marked NOT idempotent for the same reason as `project-label-add`: the vendor
 * documents no de-duplication.
 *
 * `photo.tag_added` is a webhook scope, so tagging is a reasonable way to
 * trigger downstream work — tag a photo "invoice" and let a webhook do the rest.
 */
interface Input {
  photoId: string;
  tags: string[] | string;
}

const photoTagAdd: ActionDefinition<Input> = {
  key: "photo-tag-add",
  type: "perform",
  resource: "tag",
  title: "Add Photo Tags",
  description: "Apply one or more tags to a photo by display value, creating any that are new.",
  idempotent: false,
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      repeat: true,
      required: true,
      hint: "Display values, not ids. An unknown value is created rather than rejected.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "display_value", type: "string", label: "Display value" },
    { key: "value", type: "string", label: "Normalised value" },
  ],

  execute(input, ctx) {
    const tags = toList(input.tags);
    if (!tags?.length) throw new Error("At least one tag is required");

    return new CompanyCamClient(ctx).json(`/photos/${encodeId(input.photoId)}/tags`, {
      method: "POST",
      body: { tags },
    });
  },
};

export default photoTagAdd;
