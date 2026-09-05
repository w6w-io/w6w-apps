import type { ActionDefinition } from "@w6w/types";
import { GammaClient } from "../lib/client.ts";

/**
 * `POST /v1.0/images/media/{savedMediaId}/archive` — verified against
 * `images/archive-image.md`. "The operation is idempotent — archiving an
 * already archived item succeeds," per the vendor's own description, which is
 * what justifies `idempotent: true` below.
 */
interface Input {
  savedMediaId: string;
}

const archiveImage: ActionDefinition<Input> = {
  key: "archive-image",
  type: "perform",
  resource: "image",
  title: "Archive Image",
  description: "Remove a generated image from the workspace media library without deleting the " +
    "underlying file — existing URLs keep working. Idempotent.",
  idempotent: true,
  params: [
    {
      key: "savedMediaId",
      label: "Saved Media ID",
      type: "string",
      required: true,
      hint: "From image.savedMediaId on a completed Get Image Generation Status response.",
    },
  ],
  output: [
    { key: "savedMediaId", type: "string", label: "Saved Media ID" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx) {
    return new GammaClient(ctx).request(
      `/images/media/${encodeURIComponent(input.savedMediaId)}/archive`,
      { method: "POST" },
    );
  },
};

export default archiveImage;
