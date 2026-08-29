import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { attachmentIdParam } from "../lib/params.ts";

/**
 * `DELETE /attachments/{attachmentId}` — delete an attachment by ID.
 *
 * Marked idempotent: deleting an already-deleted attachment answers
 * `404 resource_not_found` rather than a second side effect.
 */
interface Input {
  attachmentId: string;
}

const attachmentDelete: ActionDefinition<Input> = {
  key: "attachment-delete",
  type: "perform",
  resource: "attachment",
  title: "Delete Attachment",
  description: "Delete an attachment by ID.",
  idempotent: true,
  params: [attachmentIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const status = await new WrikeClient(ctx, host).status(
      `/attachments/${encodeURIComponent(input.attachmentId)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default attachmentDelete;
