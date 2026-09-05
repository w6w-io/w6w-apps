import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import {
  accountIdParam,
  asOptionalJson,
  customFieldsParam,
  listIdParam,
  subscriberIdParam,
  subscriberWritableStatusOptions,
} from "../lib/params.ts";

/**
 * `PATCH /accounts/{accountId}/lists/{listId}/subscribers/{subscriberId}`.
 *
 * Succeeds with the non-standard status **`209`** and returns the updated
 * subscriber as the body — see `lib/client.ts` for the full finding.
 *
 * **`tags` is a different shape here than on Add Subscriber.** Adding a
 * subscriber takes a flat array to set as their tags; updating one takes
 * `{"add": [...], "remove": [...]}` — an additive/subtractive edit, not a
 * replacement. Passing the same flat array shape here silently does nothing
 * useful (it matches no documented property), which is why this action
 * exposes two separate "Add tags" / "Remove tags" params rather than one
 * `tags` param shared with `subscriber-add`.
 *
 * `status` can only be set to `subscribed` or `unsubscribed` — AWeber's own
 * note: "you cannot set a subscriber's status to unconfirmed" through this
 * endpoint.
 */
interface Input {
  accountId: string;
  listId: string;
  subscriberId: string;
  email?: string;
  name?: string;
  status?: string;
  addTags?: string[] | string;
  removeTags?: string[] | string;
  customFields?: unknown;
  adTracking?: string;
  miscNotes?: string;
  strictCustomFields?: boolean;
}

function toList(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  const items = Array.isArray(v) ? v : v.split(",");
  const trimmed = items.map((s) => s.trim()).filter(Boolean);
  return trimmed.length ? trimmed : undefined;
}

const subscriberUpdate: ActionDefinition<Input> = {
  key: "subscriber-update",
  type: "perform",
  resource: "subscriber",
  title: "Update Subscriber",
  description: "Update a subscriber's fields, status, or tags by id.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    subscriberIdParam,
    { key: "email", label: "New email", type: "string" },
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "select", options: subscriberWritableStatusOptions },
    { key: "addTags", label: "Add tags", type: "multiselect" },
    { key: "removeTags", label: "Remove tags", type: "multiselect" },
    customFieldsParam,
    { key: "adTracking", label: "Ad tracking", type: "string" },
    { key: "miscNotes", label: "Notes", type: "string" },
    {
      key: "strictCustomFields",
      label: "Strict custom field names",
      type: "boolean",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    const { accountId, listId, subscriberId } = input;
    const tags = compact({ add: toList(input.addTags), remove: toList(input.removeTags) });

    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/subscribers/${
        encodeId(subscriberId)
      }`,
      {
        method: "PATCH",
        body: compact({
          email: input.email,
          name: input.name,
          status: input.status,
          tags: Object.keys(tags).length ? tags : undefined,
          custom_fields: asOptionalJson<Record<string, string>>(
            input.customFields,
            "Custom fields",
          ),
          ad_tracking: input.adTracking,
          misc_notes: input.miscNotes,
          strict_custom_fields: input.strictCustomFields === undefined
            ? undefined
            : String(!!input.strictCustomFields),
        }),
      },
    );
  },
};

export default subscriberUpdate;
