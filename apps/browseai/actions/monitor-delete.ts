import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { monitorIdParam, robotIdParam } from "../lib/params.ts";

/**
 * `DELETE /v2/robots/{robotId}/monitors/{monitorId}` — remove a monitor.
 *
 * The response carries no payload beyond `{statusCode, messageCode}` — nothing
 * to echo back — so this reports only that the call succeeded. Deleting an
 * already-deleted monitor answers `404 not_found` rather than a second
 * success, which is why this app still leaves it `idempotent: true`: retrying
 * it never produces a second side effect, it only ever converges on "gone".
 */
interface Input {
  robotId: string;
  monitorId: string;
}

interface Output {
  deleted: true;
}

const monitorDelete: ActionDefinition<Input, Output> = {
  key: "monitor-delete",
  type: "perform",
  resource: "monitor",
  title: "Delete Monitor",
  description: "Delete a monitor from a robot.",
  idempotent: true,
  params: [robotIdParam, monitorIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new BrowseAiClient(ctx).request(
      `/robots/${encodeURIComponent(input.robotId)}/monitors/${
        encodeURIComponent(input.monitorId)
      }`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default monitorDelete;
