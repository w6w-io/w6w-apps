import type { ActionDefinition } from "@w6w/types";
import { PhantomBusterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /agents/delete` — deletes an agent by id. Safe to retry: a second
 * delete of an already-deleted agent errors rather than causing further harm.
 * The vendor documents a `403` when the agent is currently running.
 */
interface Input {
  id: string;
}

const agentDelete: ActionDefinition<Input> = {
  key: "agent-delete",
  type: "perform",
  title: "Delete Agent",
  description: "Delete an agent by id. Fails with 403 if the agent is currently running.",
  idempotent: true,
  params: [idParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    const { status } = await client.postRaw("/agents/delete", { id: input.id });
    return { status };
  },
};

export default agentDelete;
