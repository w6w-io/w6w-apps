import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  labelId: string;
}

/**
 * Delete a label. This also removes the label from every message it was
 * attached to.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.labels/delete
 */
const deleteLabel: ActionDefinition<Input> = {
  key: "delete-label",
  type: "perform",
  resource: "label",
  title: "Delete Label",
  description: "Permanently delete a Gmail label.",
  params: [
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    await client.request(`/users/me/labels/${input.labelId}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deleteLabel;
