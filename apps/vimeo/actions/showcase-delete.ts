import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { showcaseIdParam } from "../lib/params.ts";

/**
 * `DELETE /me/albums/{album_id}` — delete a showcase.
 *
 * Unlike a folder, a showcase holds references rather than containment: Vimeo
 * documents no `should_delete_clips` equivalent here, and deleting a showcase
 * leaves every video in it untouched in the account. There is nothing to guard
 * against, which is why this action has no destructive flag.
 *
 * Answers `204`. `403` means either the token lacks the scope or the account
 * cannot delete this showcase; `404` means no such showcase.
 */
interface Input {
  showcaseId: string;
}

const showcaseDelete: ActionDefinition<Input, { deleted: boolean; showcaseId: string }> = {
  key: "showcase-delete",
  type: "perform",
  resource: "showcase",
  title: "Delete Showcase",
  description: "Delete a showcase. The videos it contained stay in the account.",
  idempotent: true,
  params: [showcaseIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete succeeded" },
    { key: "showcaseId", type: "string", label: "The deleted showcase ID" },
  ],

  async execute(input, ctx) {
    const showcaseId = idFromRef(input.showcaseId, "Showcase ID");
    await new VimeoClient(ctx).request(`/me/albums/${showcaseId}`, { method: "DELETE" });
    return { deleted: true, showcaseId };
  },
};

export default showcaseDelete;
