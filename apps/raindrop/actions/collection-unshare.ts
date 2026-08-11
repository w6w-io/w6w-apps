import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { collectionPathIdParam } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/collection/{id}/sharing` — stop sharing, or leave.
 *
 * **One route, two completely different outcomes, chosen by who you are.** The
 * reference is explicit:
 *
 *  - **Owner** — the collection is unshared and *every* collaborator is removed.
 *  - **Member or viewer** — only you are removed from the collaborator list.
 *
 * Nothing in the request distinguishes them, so the same workflow step does
 * something drastically different depending on which connection runs it. There
 * is no way to make that safer from here beyond saying so plainly, which the
 * description does; a caller who needs the narrow behaviour should use Remove
 * Collaborator with an explicit user ID instead.
 *
 * Idempotent: an already-unshared collection converges on the same state.
 */
interface Input {
  id: number;
}

const collectionUnshare: ActionDefinition<Input> = {
  key: "collection-unshare",
  type: "perform",
  resource: "sharing",
  title: "Unshare or Leave Collection",
  description:
    "If the connected account owns the collection, this removes ALL collaborators. If it is a " +
    "member or viewer, it removes only itself. The request is identical either way.",
  idempotent: true,
  params: [collectionPathIdParam],
  output: [{ key: "result", type: "boolean", label: "Unshared" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok(`/collection/${encodeId(input.id)}/sharing`, {
      method: "DELETE",
    });
    return { result: body.result !== false };
  },
};

export default collectionUnshare;
