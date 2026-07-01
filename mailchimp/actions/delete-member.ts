import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";
import { subscriberHash } from "../lib/subscriber-hash.ts";

interface Input {
  listId: string;
  email: string;
}

/**
 * Permanently delete a member from a list. Mailchimp accepts an email address
 * or an MD5-of-lowercased-email "subscriber hash" here; either resolves the
 * same member. We accept email for ergonomics and hash it, matching n8n.
 * Mailchimp returns 204 on success; we translate that to `{ success: true }`
 * so downstream nodes have something to key off.
 */
const deleteMember: ActionDefinition<Input, { success: boolean }> = {
  key: "delete-member",
  type: "perform",
  resource: "member",
  title: "Delete Member",
  description: "Permanently delete a subscriber from a list.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const hash = subscriberHash(input.email);
    await client.request(
      `/lists/${input.listId}/members/${hash}/actions/delete-permanent`,
      { method: "POST" },
    );
    return { success: true };
  },
};

export default deleteMember;
