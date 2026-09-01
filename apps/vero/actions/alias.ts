import type { ActionDefinition } from "@w6w/types";
import { request } from "../lib/client.ts";

/**
 * `PUT /users/reidentify` — changes a user's identifier (`id`). Verified
 * 2026-09-01 against Vero's OpenAPI schema embedded in
 * help.getvero.com/api-reference/users/alias
 * (`originalFileLocation: "api-reference/track/track.yml"`).
 *
 * Vero's own docs call this an advanced operation ("may have unintended
 * consequences") used to merge two user identities' data into one.
 *
 * `idempotent: false` — a successful call retargets `id` onto `newId`, so a
 * retry against the same (now-stale) `id` no longer resolves to the profile
 * it just moved.
 */
const alias: ActionDefinition = {
  key: "alias",
  type: "perform",
  resource: "person",
  title: "Alias User",
  description: "Change a user's identifier, merging their identity onto the new id.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Current User ID",
      type: "string",
      required: true,
      hint: "The user's current identifier.",
    },
    {
      key: "newId",
      label: "New User ID",
      type: "string",
      required: true,
      hint: "The identifier to change to.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted by Vero" },
    { key: "message", type: "string", label: "Vero's response message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = typeof p.id === "string" ? p.id.trim() : "";
    if (!id) throw new Error("`id` is required");
    const newId = typeof p.newId === "string" ? p.newId.trim() : "";
    if (!newId) throw new Error("`newId` is required");

    ctx.log("info", "Vero alias", { id, newId });
    return await request(ctx, "PUT", "/users/reidentify", { id, new_id: newId });
  },
};

export default alias;
