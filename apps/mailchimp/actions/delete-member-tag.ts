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
 * Detach tags from a subscriber. Same endpoint as `create-member-tag` — the
 * per-tag `status: "inactive"` means "remove". Mailchimp returns 204; we
 * translate to `{ success: true }`.
 */
const deleteMemberTag: ActionDefinition<Input, { success: boolean }> = {
  key: "delete-member-tag",
  type: "perform",
  resource: "member-tag",
  title: "Remove Tags from Member",
  description: "Remove one or more tags from a subscriber.",
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
      hint: "Tag names to remove.",
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
      tags: input.tags.map((name) => ({ name, status: "inactive" })),
    };
    if (input.isSyncing !== undefined) body.is_syncing = input.isSyncing;

    await client.request(`/lists/${input.listId}/members/${hash}/tags`, {
      method: "POST",
      body,
    });
    return { success: true };
  },
};

export default deleteMemberTag;
