import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId, locationId } from "../lib/client.ts";
import { accountIdParam, asOptionalJson, customFieldsParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/subscribers` — add a subscriber.
 *
 * Two things the schema gets exactly right and easy to get wrong:
 *
 *  - **Success is `201` with no body**, only a `Location` header naming the
 *    new subscriber. This action extracts the id from it (see
 *    {@link locationId}) instead of returning an empty object.
 *  - **`update_existing` and `strict_custom_fields` are the strings
 *    `"true"`/`"false"`, not JSON booleans.** Sending the boolean `true`
 *    (what `JSON.stringify` would naturally produce from a checkbox) is
 *    outside the documented enum. This action accepts a real boolean param
 *    and converts it.
 *
 * AWeber's own warning, verbatim: "Attempting to use the endpoint to bulk add
 * subscribers is considered abuse which violates our Terms of Service" — use
 * the list importer for bulk loads, not a workflow loop over this action.
 * Not marked idempotent for the same reason `update_existing` exists at all:
 * without it, adding the same email twice is a `400`, not a no-op.
 */
interface Input {
  accountId: string;
  listId: string;
  email: string;
  name?: string;
  tags?: string[] | string;
  customFields?: unknown;
  adTracking?: string;
  ipAddress?: string;
  miscNotes?: string;
  updateExisting?: boolean;
  strictCustomFields?: boolean;
}

const subscriberAdd: ActionDefinition<Input> = {
  key: "subscriber-add",
  type: "perform",
  resource: "subscriber",
  title: "Add Subscriber",
  description: "Add a subscriber to a list. Not for bulk loads — use AWeber's list importer.",
  idempotent: false,
  params: [
    accountIdParam,
    listIdParam,
    { key: "email", label: "Email", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "tags", label: "Tags", type: "multiselect" },
    customFieldsParam,
    { key: "adTracking", label: "Ad tracking", type: "string" },
    {
      key: "ipAddress",
      label: "IP address",
      type: "string",
      hint: "Only usable when the subscriber is first created; drives geo-location fields. " +
        "Internal, private, or reserved addresses are rejected.",
    },
    { key: "miscNotes", label: "Notes", type: "string" },
    {
      key: "updateExisting",
      label: "Update if already subscribed",
      type: "boolean",
      hint: "If the email is already on the list, update it (only the fields the update action " +
        "covers) instead of failing. Any tags given here are appended, not replaced.",
    },
    {
      key: "strictCustomFields",
      label: "Strict custom field names",
      type: "boolean",
      hint: "Match custom field names case-sensitively, and fail if one isn't defined on the list.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "New subscriber ID" },
    { key: "location", type: "string", label: "URL of the new subscriber" },
  ],

  async execute(input, ctx) {
    const body = compact({
      email: input.email,
      name: input.name,
      tags: Array.isArray(input.tags) ? input.tags : input.tags ? [input.tags] : undefined,
      custom_fields: asOptionalJson<Record<string, string>>(input.customFields, "Custom fields"),
      ad_tracking: input.adTracking,
      ip_address: input.ipAddress,
      misc_notes: input.miscNotes,
      // The API's enum is the literal strings "true"/"false", not a JSON boolean.
      update_existing: input.updateExisting === undefined
        ? undefined
        : String(!!input.updateExisting),
      strict_custom_fields: input.strictCustomFields === undefined
        ? undefined
        : String(!!input.strictCustomFields),
    });

    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/subscribers`,
      { method: "POST", body },
    );
    const location = res.headers.get("location");
    return { id: locationId(location), location: location ?? undefined };
  },
};

export default subscriberAdd;
