import type { ActionDefinition } from "@w6w/types";
import { ElevenLabsClient, encodeId } from "../lib/client.ts";

/**
 * `POST /v1/voices/add/{public_user_id}/{voice_id}` — copy a Voice Library voice
 * into this account.
 *
 * Both path segments come from one Search Voice Library result:
 * `public_owner_id` and `voice_id`. The voice id the copy gets in *this* account
 * is a new one, returned as `voice_id` in the response — it is not the library
 * id, and using the library id in a synthesis request afterwards fails with
 * `voice_not_found`.
 *
 * `new_name` is the only required body field, and it is what the voice will be
 * called in this account's dropdowns.
 *
 * ## Not idempotent
 *
 * Adding consumes one of the account's `voice_limit` slots and one of its
 * `max_voice_add_edits` allowance — both reported by the plan-headroom check —
 * and calling it twice adds the voice twice under the same name. A retry would
 * spend a slot for nothing.
 */
interface Input {
  publicOwnerId: string;
  voiceId: string;
  newName: string;
  bookmarked?: boolean;
}

const voiceAddFromLibrary: ActionDefinition<Input> = {
  key: "voice-add-from-library",
  type: "perform",
  resource: "voice",
  title: "Add Voice from Library",
  description: "Copy a public Voice Library voice into this account under a name you choose.",
  idempotent: false,
  params: [
    {
      key: "publicOwnerId",
      label: "Public owner ID",
      type: "string",
      required: true,
      hint: "The `public_owner_id` of a Search Voice Library result.",
    },
    {
      key: "voiceId",
      label: "Library voice ID",
      type: "string",
      required: true,
      hint: "The `voice_id` of the same result. The copy gets a NEW id in this account — use the " +
        "one this action returns for synthesis, not this one.",
    },
    {
      key: "newName",
      label: "Name in this account",
      type: "string",
      required: true,
      hint: "What the voice will be called in your voice list.",
    },
    {
      key: "bookmarked",
      label: "Bookmark it",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "On by default, matching the API.",
    },
  ],
  output: [
    { key: "voice_id", type: "string", label: "The new voice ID in this account" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { new_name: input.newName };
    if (input.bookmarked === false) body.bookmarked = false;

    return new ElevenLabsClient(ctx).json(
      `/v1/voices/add/${encodeId(input.publicOwnerId)}/${encodeId(input.voiceId)}`,
      { method: "POST", body },
    );
  },
};

export default voiceAddFromLibrary;
