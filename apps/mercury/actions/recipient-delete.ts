import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { recipientIdParam } from "../lib/params.ts";

/**
 * `DELETE /recipient/{recipientId}` — remove a saved recipient. No request
 * body, no documented response body. Marked idempotent: deleting an
 * already-deleted recipient repeats Mercury's own not-found error rather
 * than causing a second side effect.
 */
interface Input {
  recipientId: string;
}

const recipientDelete: ActionDefinition<Input> = {
  key: "recipient-delete",
  type: "perform",
  resource: "recipient",
  title: "Delete Recipient",
  description: "Remove a saved recipient.",
  idempotent: true,
  params: [recipientIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Always true on success" }],

  async execute(input, ctx) {
    await new MercuryClient(ctx).json(
      `/recipient/${encodeURIComponent(input.recipientId)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default recipientDelete;
