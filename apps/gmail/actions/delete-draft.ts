import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  draftId: string;
}

/**
 * Delete a draft permanently.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/delete
 */
const deleteDraft: ActionDefinition<Input> = {
  key: "delete-draft",
  type: "perform",
  resource: "draft",
  title: "Delete Draft",
  description: "Permanently delete a Gmail draft.",
  params: [
    { key: "draftId", label: "Draft ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    await client.request(`/users/me/drafts/${input.draftId}`, { method: "DELETE" });
    return { success: true };
  },
};

export default deleteDraft;
