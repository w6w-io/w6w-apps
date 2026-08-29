import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam, pinIdParam } from "../lib/params.ts";

/**
 * `DELETE /v5/pins/{pin_id}` — `204` with no body on success. Safe to retry:
 * deleting an already-deleted Pin just answers `404` rather than creating any
 * new side effect.
 */
interface Input {
  pinId: string;
  adAccountId?: string;
}

const pinDelete: ActionDefinition<Input> = {
  key: "pin-delete",
  type: "perform",
  resource: "pin",
  title: "Delete Pin",
  description: "Permanently delete a Pin. Safe to retry.",
  idempotent: true,
  params: [pinIdParam, adAccountIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new PinterestClient(ctx).status(
      `/pins/${encodeURIComponent(input.pinId)}`,
      { method: "DELETE", query: { ad_account_id: input.adAccountId } },
    );
    return { deleted: status === 200 || status === 204, status };
  },
};

export default pinDelete;
