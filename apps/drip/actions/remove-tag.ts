import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
  tag: string;
}

/**
 * `DELETE /v2/:account_id/subscribers/:id_or_email/tags/:tag`.
 *
 * developer.drip.com's prose "HTTP Endpoint" line for this one actually
 * reads `DELETE /:account_id/subscribers/:email/tags/:tag` (missing the
 * `/v2` prefix every other endpoint on the page carries) — almost certainly
 * a doc typo, since the page's own runnable curl example for this exact
 * section uses `https://api.getdrip.com/v2/YOUR_ACCOUNT_ID/subscribers/ID_OR_EMAIL/tags/TAG`.
 * This action follows the curl example.
 */
const removeTag: ActionDefinition<Input> = {
  key: "remove-tag",
  type: "perform",
  resource: "tag",
  title: "Remove Tag",
  description: "Remove a tag from a subscriber.",
  idempotent: true,
  params: [
    {
      key: "idOrEmail",
      label: "ID or email",
      type: "string",
      required: true,
    },
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    await new DripClient(ctx).request(
      `/subscribers/${encodeURIComponent(input.idOrEmail)}/tags/${encodeURIComponent(input.tag)}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default removeTag;
