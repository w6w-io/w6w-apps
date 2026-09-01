import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { sequenceIdParam } from "../lib/params.ts";

/**
 * `POST /v3/sequences/{id}/start` — start a sequence, or resume a paused one.
 * Needs contacts, a connected email account, and a schedule with sending
 * hours. Requires `sequences:operate`.
 *
 * Not idempotent: starting an already-active sequence answers `409 Conflict`
 * rather than a no-op success, so a retry after a genuine failure is safe but
 * a retry after an already-applied start is not silently harmless.
 */
interface Input {
  id: number;
}

const sequenceStart: ActionDefinition<Input> = {
  key: "sequence-start",
  type: "perform",
  resource: "sequence",
  title: "Start Sequence",
  description: "Start a sequence, or resume a paused one.",
  idempotent: false,
  params: [sequenceIdParam],
  output: [
    { key: "id", type: "number", label: "Sequence ID" },
    { key: "status", type: "string", label: "new | active | paused" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).json(`/sequences/${input.id}/start`, { method: "POST" });
  },
};

export default sequenceStart;
