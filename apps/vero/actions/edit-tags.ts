import type { ActionDefinition } from "@w6w/types";
import { request } from "../lib/client.ts";

/**
 * `PUT /users/tags/edit` — adds and/or removes tags on a user's profile in
 * one call. Verified 2026-09-01 against Vero's OpenAPI schema embedded in
 * help.getvero.com/api-reference/tags/edit
 * (`originalFileLocation: "api-reference/track/track.yml"`).
 *
 * `idempotent: true` — adding/removing a tag that's already in that state is
 * a no-op; this is a set-membership operation, not an append-only log.
 */
const editTags: ActionDefinition = {
  key: "edit-tags",
  type: "perform",
  resource: "person",
  title: "Add/Remove Tags",
  description: "Add and/or remove tags on a user's profile.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's unique identifier.",
    },
    {
      key: "add",
      label: "Add Tags",
      type: "array",
      item: { type: "string" },
      hint: "Tags to add to the user's profile.",
    },
    {
      key: "remove",
      label: "Remove Tags",
      type: "array",
      item: { type: "string" },
      hint: "Tags to remove from the user's profile.",
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
    const add = Array.isArray(p.add) ? p.add.filter((t): t is string => typeof t === "string") : [];
    const remove = Array.isArray(p.remove)
      ? p.remove.filter((t): t is string => typeof t === "string")
      : [];
    if (add.length === 0 && remove.length === 0) {
      throw new Error("at least one of `add` or `remove` is required");
    }

    ctx.log("info", "Vero edit tags", { id, add: add.length, remove: remove.length });
    return await request(ctx, "PUT", "/users/tags/edit", { id, add, remove });
  },
};

export default editTags;
