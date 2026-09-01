import type { ActionDefinition } from "@w6w/types";
import { request } from "../lib/client.ts";

/**
 * `POST /users/unsubscribe` — globally unsubscribes a user from Vero email.
 * Verified 2026-09-01 against Vero's OpenAPI schema embedded in
 * help.getvero.com/api-reference/users/unsubscribe
 * (`originalFileLocation: "api-reference/track/track.yml"`).
 *
 * `idempotent: true` — a set-membership operation; unsubscribing an
 * already-unsubscribed user is a no-op.
 */
const unsubscribe: ActionDefinition = {
  key: "unsubscribe",
  type: "perform",
  resource: "person",
  title: "Unsubscribe User",
  description: "Globally unsubscribe a user.",
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

    ctx.log("info", "Vero unsubscribe", { id });
    return await request(ctx, "POST", "/users/unsubscribe", { id });
  },
};

export default unsubscribe;
