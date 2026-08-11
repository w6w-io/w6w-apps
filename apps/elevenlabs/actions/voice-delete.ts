import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";
import { voiceIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/voices/{voice_id}` — remove a voice from this account.
 *
 * Frees one of the `voice_limit` slots reported by the plan-headroom check, which
 * is the usual reason to call it from a workflow: a pipeline that clones a voice
 * per job exhausts the slot allowance long before it runs out of characters.
 *
 * Marked idempotent: deleting an already-deleted voice changes nothing, so a
 * retry after a dropped connection is safe (the second attempt reports a
 * `voice_not_found` error rather than deleting something else).
 */
interface Input {
  voiceId: string;
}

const voiceDelete: ActionDefinition<Input> = {
  key: "voice-delete",
  type: "perform",
  resource: "voice",
  title: "Delete Voice",
  description: "Delete a voice from this account, freeing one voice slot.",
  idempotent: true,
  params: [voiceIdParam],
  output: [{ key: "status", type: "string", label: "`ok` when the voice was deleted" }],

  execute(input, ctx) {
    return new ElevenLabsClient(ctx).json(`/v1/voices/${encodeId(input.voiceId)}`, {
      method: "DELETE",
    });
  },
};

export default voiceDelete;
