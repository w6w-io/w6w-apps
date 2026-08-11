import type { ActionDefinition } from "@w6w/types";
import { encodeId, RaindropClient } from "../lib/client.ts";
import { collectionPathIdParam } from "../lib/params.ts";

/**
 * `DELETE /rest/v1/collection/{id}/sharing/{userId}` — remove one collaborator.
 *
 * The targeted counterpart to Unshare or Leave Collection, which removes either
 * everyone or only yourself depending on your role. This one names its victim,
 * so it does the same thing whoever runs it.
 *
 * `userId` is the collaborator's Raindrop user id (`_id` from List
 * Collaborators), not their email.
 *
 * Idempotent: removing someone already removed converges on the same state.
 */
interface Input {
  id: number;
  userId: number;
}

const collaboratorRemove: ActionDefinition<Input> = {
  key: "collaborator-remove",
  type: "perform",
  resource: "sharing",
  title: "Remove Collaborator",
  description: "Remove one named person from a shared collection.",
  idempotent: true,
  params: [
    collectionPathIdParam,
    {
      key: "userId",
      label: "Collaborator user ID",
      type: "number",
      required: true,
      validation: { integer: true },
      hint: "The `_id` from List Collaborators — a user ID, not an email address.",
    },
  ],
  output: [{ key: "result", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const body = await new RaindropClient(ctx).ok(
      `/collection/${encodeId(input.id)}/sharing/${encodeId(input.userId)}`,
      { method: "DELETE" },
    );
    return { result: body.result !== false };
  },
};

export default collaboratorRemove;
