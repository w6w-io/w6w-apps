import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { sequenceIdParam } from "../lib/params.ts";

/**
 * `POST /v3/sequences/{id}/pause` — stop a running sequence from sending
 * further steps while keeping it and its contacts in place. It must have
 * started once. Requires `sequences:operate`.
 *
 * Not idempotent, for the same reason as `sequence-start`: pausing a sequence
 * that isn't running answers `409 Conflict`.
 */
interface Input {
  id: number;
}

const sequencePause: ActionDefinition<Input> = {
  key: "sequence-pause",
  type: "perform",
  resource: "sequence",
  title: "Pause Sequence",
  description: "Stop a running sequence from sending further steps, keeping its contacts enrolled.",
  idempotent: false,
  params: [sequenceIdParam],
  output: [
    { key: "id", type: "number", label: "Sequence ID" },
    { key: "status", type: "string", label: "new | active | paused" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).json(`/sequences/${input.id}/pause`, { method: "POST" });
  },
};

export default sequencePause;
