import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  draftId: string;
}

/**
 * Send an existing draft. The endpoint takes `{ id }` in the body — no MIME
 * blob needed since it lives on the server.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.drafts/send
 */
const sendDraft: ActionDefinition<Input> = {
  key: "send-draft",
  type: "perform",
  resource: "draft",
  title: "Send Draft",
  description: "Send an existing Gmail draft.",
  params: [
    { key: "draftId", label: "Draft ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request("/users/me/drafts/send", {
      method: "POST",
      body: { id: input.draftId },
    });
  },
};

export default sendDraft;
