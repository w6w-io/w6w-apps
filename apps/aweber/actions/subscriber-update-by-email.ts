import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  asOptionalJson,
  customFieldsParam,
  listIdParam,
  subscriberWritableStatusOptions,
} from "../lib/params.ts";

/**
 * `PATCH /accounts/{accountId}/lists/{listId}/subscribers?subscriber_email=...`
 *
 * Same operation as `subscriber-update`, addressed by email instead of a
 * numeric id — useful when a workflow only has the address (e.g. from a
 * form submission) and would otherwise need an extra `subscriber-find` call
 * first. Also answers `209` with the updated subscriber as the body.
 */
interface Input {
  accountId: string;
  listId: string;
  email: string;
  newEmail?: string;
  name?: string;
  status?: string;
  addTags?: string[] | string;
  removeTags?: string[] | string;
  customFields?: unknown;
  miscNotes?: string;
}

function toList(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  const items = Array.isArray(v) ? v : v.split(",");
  const trimmed = items.map((s) => s.trim()).filter(Boolean);
  return trimmed.length ? trimmed : undefined;
}

const subscriberUpdateByEmail: ActionDefinition<Input> = {
  key: "subscriber-update-by-email",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber by Email",
  description: "Update a subscriber's fields, status, or tags, addressed by email.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    { key: "newEmail", label: "New email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "select", options: subscriberWritableStatusOptions },
    { key: "addTags", label: "Add tags", type: "multiselect" },
    { key: "removeTags", label: "Remove tags", type: "multiselect" },
    customFieldsParam,
    { key: "miscNotes", label: "Notes", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const tags = compact({ add: toList(input.addTags), remove: toList(input.removeTags) });

    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/subscribers`,
      {
        method: "PATCH",
        query: { subscriber_email: input.email },
        body: compact({
          email: input.newEmail,
          name: input.name,
          status: input.status,
          tags: Object.keys(tags).length ? tags : undefined,
          custom_fields: asOptionalJson<Record<string, string>>(
            input.customFields,
            "Custom fields",
          ),
          misc_notes: input.miscNotes,
        }),
      },
    );
  },
};

export default subscriberUpdateByEmail;
