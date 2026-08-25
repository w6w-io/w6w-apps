import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";

interface Input {
  fromNumber: string;
  messageHandle: string;
  reaction: string;
  partIndex?: number;
}

/**
 * `POST /api/send-reaction` — iMessage-only tapbacks, including arbitrary
 * emoji. Sendblue's matching is exact and unforgiving, spelled out here so a
 * caller does not lose an hour to it: named classic tapbacks
 * (`love`/`like`/`dislike`/`laugh`/`emphasize`/`question`) resolve BEFORE
 * emoji, so `love` is always Apple's heart tapback while `❤️` is a separate
 * emoji reaction; a value must be exactly ONE complete emoji (composed
 * emoji — skin tones, ZWJ family sequences, flags, keycaps — count as one)
 * with NO surrounding text or whitespace and using the emoji-picker form
 * (`❤️` with the variation selector, not the bare text-style `❤`); names are
 * case-sensitive (`Love` is rejected). Prefix any value with `-` to remove a
 * reaction sent earlier with that exact value.
 */
const reactionSend: ActionDefinition<Input> = {
  key: "reaction-send",
  type: "perform",
  resource: "reaction",
  title: "Send Reaction",
  description: "Add (or remove, with a `-` prefix) an iMessage tapback on a received message.",
  idempotent: false,
  params: [
    { key: "fromNumber", label: "From (Sendblue number)", type: "string", required: true },
    {
      key: "messageHandle",
      label: "Message handle",
      type: "string",
      required: true,
      hint: "The PRIMARY handle of a received message — not an attachment-specific handle.",
    },
    {
      key: "reaction",
      label: "Reaction",
      type: "string",
      required: true,
      hint:
        'One of love/like/dislike/laugh/emphasize/question, or exactly one emoji (e.g. "🔥"). ' +
        'Prefix with "-" to remove (e.g. "-love", "-🔥").',
    },
    {
      key: "partIndex",
      label: "Part index",
      type: "number",
      advanced: true,
      hint: "Which part of a multi-part message to react to. Defaults to 0 — leave unset unless " +
        "you know the exact part.",
    },
  ],
  output: [
    { key: "reaction", type: "string", label: "Accepted reaction value" },
    { key: "message_handle", type: "string", label: "Message handle" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post(
      "/api/send-reaction",
      compact({
        from_number: input.fromNumber,
        message_handle: input.messageHandle,
        reaction: input.reaction,
        part_index: input.partIndex,
      }),
    );
  },
};

export default reactionSend;
