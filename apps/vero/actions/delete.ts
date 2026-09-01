import type { ActionDefinition } from "@w6w/types";
import { request } from "../lib/client.ts";

/**
 * `POST /users/delete` — permanently deletes a user. Verified 2026-09-01
 * against Vero's OpenAPI schema embedded in
 * help.getvero.com/api-reference/users/delete
 * (`originalFileLocation: "api-reference/track/track.yml"`).
 *
 * Vero's own docs warn this is permanent: "all properties and activities
 * will be lost forever" and deleted users are not recoverable.
 *
 * `idempotent: true` — deleting an already-deleted (or never-existing) id
 * reaches the same end state: the user does not exist.
 */
const del: ActionDefinition = {
  key: "delete",
  type: "perform",
  resource: "person",
  title: "Delete User",
  description: "Permanently delete a user. Not recoverable.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's unique identifier.",
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

    ctx.log("info", "Vero delete", { id });
    return await request(ctx, "POST", "/users/delete", { id });
  },
};

export default del;
