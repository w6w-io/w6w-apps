import type { ActionDefinition } from "@w6w/types";
import { OnfleetClient } from "../lib/client.ts";

/**
 * `DELETE /workers/:id` — remove a worker.
 *
 * A worker with an active task cannot be deleted until that task completes.
 */
const action: ActionDefinition = {
  key: "worker-delete",
  type: "perform",
  resource: "worker",
  title: "Delete worker",
  description: "Remove a worker. Fails while the worker has an active task.",
  idempotent: true,
  params: [
    { key: "workerId", label: "Worker ID", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const { workerId } = input as { workerId: string };
    if (!workerId) throw new Error("`workerId` is required");
    await new OnfleetClient(ctx).request(`/workers/${encodeURIComponent(workerId)}`, {
      method: "DELETE",
    });
    ctx.log("info", "deleted an Onfleet worker", { workerId });
    return { deleted: true };
  },
};

export default action;
