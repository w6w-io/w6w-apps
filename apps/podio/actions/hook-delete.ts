import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient } from "../lib/client.ts";

/**
 * `DELETE /hook/{hook_id}` — "Deletes the hook with the given id."
 *
 * Idempotent: deleting a deleted hook answers 404, and the end state of two
 * calls is the end state of one.
 *
 * Podio's reference carries no App Authentication badge on this operation,
 * unlike Create Webhook and List Webhooks — the vendor's own asymmetry, not a
 * transcription error. An app-token connection can therefore create and read
 * hooks but may not be able to remove them; that is what the badge says, so it
 * is what this app reports rather than guessing otherwise.
 *
 * The endpoint returns no body; this action reports the HTTP status.
 */
interface Input {
  hookId: string;
}

const hookDelete: ActionDefinition<Input> = {
  key: "hook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhook",
  description:
    "Remove a webhook. Podio's reference does not mark this operation as available under " +
    "App Authentication, unlike creating and listing hooks.",
  idempotent: true,
  params: [
    {
      key: "hookId",
      label: "Hook ID",
      type: "string",
      required: true,
      hint: "From List Webhooks.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PodioClient(ctx).status(
      `/hook/${encodeSegment(input.hookId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default hookDelete;
