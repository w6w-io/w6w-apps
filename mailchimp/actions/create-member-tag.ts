import type { ActionDefinition } from "@w6w/types";
import { MailchimpClient } from "../lib/client.ts";
import { subscriberHash } from "../lib/subscriber-hash.ts";

interface Input {
  listId: string;
  email: string;
  tags: string[];
  isSyncing?: boolean;
}

/**
 * Attach tags to a subscriber. Mailchimp uses one endpoint —
 * `POST /lists/{list_id}/members/{hash}/tags` — with each tag carrying a
 * `status` of `active` (add) or `inactive` (remove). This action always sends
 * `active`; the sibling `delete-member-tag` sends `inactive`.
 */
const createMemberTag: ActionDefinition<Input, { success: boolean }> = {
  key: "create-member-tag",
  type: "perform",
  resource: "member-tag",
  title: "Add Tags to Member",
  description: "Attach one or more tags to a subscriber.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      required: true,
      repeat: true,
      hint: "Tag names to attach.",
    },
    {
      key: "isSyncing",
      label: "Is syncing",
      type: "boolean",
      hint: "When true, tag-based automations will NOT fire.",
    },
  ],

  async execute(input, ctx) {
    const client = new MailchimpClient(ctx);
    const hash = subscriberHash(input.email);
    const body: Record<string, unknown> = {
      tags: input.tags.map((name) => ({ name, status: "active" })),
    };
    if (input.isSyncing !== undefined) body.is_syncing = input.isSyncing;

    await client.request(`/lists/${input.listId}/members/${hash}/tags`, {
      method: "POST",
      body,
    });
    return { success: true };
  },
};

export default createMemberTag;
