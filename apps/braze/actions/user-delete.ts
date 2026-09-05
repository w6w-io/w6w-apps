import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /users/delete` — verified against the fetched spec. Deletes users by
 * `external_ids`, `braze_ids`, or `user_aliases` (any combination). Deleting
 * an already-deleted or nonexistent user is a no-op, so this is idempotent.
 */
const action: ActionDefinition = {
  key: "user-delete",
  type: "perform",
  resource: "user",
  title: "Delete Users",
  description: "Delete one or more users by external ID, Braze ID, or alias.",
  idempotent: true,
  params: [
    {
      key: "externalIds",
      label: "External IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "brazeIds",
      label: "Braze IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "userAliases",
      label: "User Aliases",
      type: "json",
      hint: "Array of { alias_name, alias_label }.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as { externalIds?: string[]; brazeIds?: string[]; userAliases?: unknown };
    ctx.log("info", "deleting Braze users", {
      externalIds: p.externalIds?.length ?? 0,
      brazeIds: p.brazeIds?.length ?? 0,
    });
    return await new BrazeClient(ctx).post("/users/delete", {
      external_ids: p.externalIds?.length ? p.externalIds : undefined,
      braze_ids: p.brazeIds?.length ? p.brazeIds : undefined,
      user_aliases: p.userAliases ?? undefined,
    });
  },
};

export default action;
