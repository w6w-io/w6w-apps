import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, sourceIdParam } from "../lib/params.ts";

/**
 * `DELETE /agents/{agentId}/sources/{sourceId}` — marks the source
 * `toBeDeleted` rather than removing it immediately; the response is the
 * source in that final state. Not marked idempotent: editing a source
 * already in this state fails with `SOURCE_PENDING_DELETION`, and repeat
 * deletes of the same source are not documented as a no-op.
 */
interface Input {
  agentId: string;
  sourceId: string;
}

const sourceDelete: ActionDefinition<Input> = {
  key: "source-delete",
  type: "perform",
  resource: "source",
  title: "Delete Source",
  description: "Mark a source for deletion. Restore it before this point with Restore Source.",
  idempotent: false,
  params: [agentIdParam, sourceIdParam],
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "status", type: "string", label: "toBeDeleted (or deleted, once fully removed)" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources/${encodeURIComponent(input.sourceId)}`,
      { method: "DELETE" },
    );
  },
};

export default sourceDelete;
