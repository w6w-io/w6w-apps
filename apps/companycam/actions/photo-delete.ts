import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";
import { actAsParam } from "../lib/params.ts";

/**
 * `DELETE /v2/photos/{id}` — delete a photo. Answers `204` with no body.
 *
 * There is no undelete in the documented API. The photo's `status` field has a
 * `deleted` value, but nothing here sets it back to `active`.
 *
 * Idempotent: a second call converges on the same state (and answers `404`,
 * which is surfaced rather than swallowed).
 */
interface Input {
  photoId: string;
  actAs?: string;
}

const photoDelete: ActionDefinition<Input> = {
  key: "photo-delete",
  type: "perform",
  resource: "photo",
  title: "Delete Photo",
  description: "Delete a photo. There is no undelete.",
  idempotent: true,
  params: [
    { key: "photoId", label: "Photo ID", type: "string", required: true },
    actAsParam,
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).status(`/photos/${encodeId(input.photoId)}`, {
      method: "DELETE",
      actAs: input.actAs,
    });
  },
};

export default photoDelete;
