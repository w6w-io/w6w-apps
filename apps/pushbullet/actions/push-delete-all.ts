import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `DELETE /v2/pushes` — delete every push belonging to the account.
 *
 * The vendor's own docs: "This call is asynchronous, the pushes will be
 * deleted after the call returns." A retry after the call has already
 * succeeded finds nothing left to delete, so this is safely retryable.
 */
const pushDeleteAll: ActionDefinition<Record<string, never>> = {
  key: "push-delete-all",
  type: "perform",
  resource: "push",
  title: "Delete All Pushes",
  description: "Delete every push belonging to the current user. Runs asynchronously on " +
    "Pushbullet's side — pushes are removed shortly after this call returns, not immediately.",
  idempotent: true,
  params: [],
  output: [{ key: "requested", type: "boolean", label: "Deletion requested" }],

  async execute(_input, ctx) {
    const status = await new PushbulletClient(ctx).status("/pushes", { method: "DELETE" });
    return { requested: status === 200 };
  },
};

export default pushDeleteAll;
