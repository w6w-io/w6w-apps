import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface BatchContact {
  id: string;
  email_address?: string;
  fields?: Record<string, unknown>;
  tags?: Record<string, boolean>;
  status?: "subscribed" | "unsubscribed" | "pending";
}

interface Input {
  listId: string;
  contacts: BatchContact[];
}

interface Output {
  success: unknown[];
  errors: unknown[];
  errorCount: number;
}

/**
 * `PUT /lists/{list_id}/contacts/batch`.
 *
 * Two things the response shape forces on a caller:
 *
 * 1. **`id` is required on every item.** Unlike the single-contact upsert,
 *    which keys on `email_address`, the batch endpoint keys on the contact id.
 *    There is no batch *create*.
 * 2. **A 200 does not mean everything worked.** The body is
 *    `{ success: [...], errors: [...] }` — per-item outcomes, each error
 *    carrying its own `id`, `status` and RFC 7807 `type`. A caller that checks
 *    only the HTTP status will silently drop failures, so this action surfaces
 *    both arrays and a convenience `errorCount`.
 *
 * `idempotent: true` — each item is a set of absolute assignments against a
 * known id, so replaying converges.
 */
const updateContactsBatch: ActionDefinition<Input, Output> = {
  key: "update-contacts-batch",
  type: "perform",
  resource: "contact",
  title: "Update Contacts (Batch)",
  description:
    "Update many contacts on one list in a single call, addressed by contact id. Returns per-item `success` and `errors` arrays — a 200 does not mean every item succeeded.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint:
        'JSON array of objects. `id` is REQUIRED on each; `email_address`, `fields`, `tags` and `status` are optional. Tags are an object here too — `[{"id": "…", "tags": {"vip": true}}]`.',
    },
  ],
  output: [
    { key: "success", type: "array", label: "Items that were updated" },
    { key: "errors", type: "array", label: "Per-item failures, each with its own id and type" },
    { key: "errorCount", type: "number", label: "Length of `errors`, for a quick branch" },
  ],

  async execute(input, ctx) {
    const body = await new EmailOctopusClient(ctx).request<
      { success?: unknown[]; errors?: unknown[] }
    >(
      `/lists/${seg(input.listId)}/contacts/batch`,
      { method: "PUT", body: { contacts: input.contacts } },
    );
    const success = body?.success ?? [];
    const errors = body?.errors ?? [];
    return { success, errors, errorCount: errors.length };
  },
};

export default updateContactsBatch;
