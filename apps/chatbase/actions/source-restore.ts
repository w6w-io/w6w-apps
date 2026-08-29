import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient } from "../lib/client.ts";
import { agentIdParam, sourceIdParam } from "../lib/params.ts";

/**
 * `POST /agents/{agentId}/sources/{sourceId}/restore` — restores a source
 * marked `toBeDeleted` back to its previous active status. Fails with
 * `SOURCE_NOT_RESTORABLE` if the source is not currently pending deletion, so
 * a second call is not a safe no-op.
 */
interface Input {
  agentId: string;
  sourceId: string;
}

const sourceRestore: ActionDefinition<Input> = {
  key: "source-restore",
  type: "perform",
  resource: "source",
  title: "Restore Source",
  description: "Restore a source pending deletion back to its previous active state.",
  idempotent: false,
  params: [agentIdParam, sourceIdParam],
  output: [
    { key: "id", type: "string", label: "Source ID" },
    { key: "status", type: "string", label: "The restored status" },
  ],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(
      `/agents/${encodeURIComponent(input.agentId)}/sources/` +
        `${encodeURIComponent(input.sourceId)}/restore`,
      { method: "POST" },
    );
  },
};

export default sourceRestore;
