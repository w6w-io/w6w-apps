import type { ActionDefinition } from "@w6w/types";
import {
  CONTACT_STATUS_OPTIONS,
  type ContactStatus,
  EmailOctopusClient,
  seg,
} from "../lib/client.ts";

interface Input {
  listId: string;
  emailAddress: string;
  status?: ContactStatus;
  fields?: Record<string, unknown>;
  tags?: Record<string, boolean>;
}

/**
 * `PUT /lists/{list_id}/contacts` — the documented *upsert*: creates the
 * contact if the email address is new, updates it if it is not. 200 either way,
 * never 201.
 *
 * **`tags` here is an OBJECT of `tag -> boolean`**, not the array
 * `create-contact` takes: `true` adds a tag, `false` removes it, and a tag not
 * mentioned is left alone. That is the one shape that can express *removal*,
 * which is why the PUT endpoints use it and the POST does not.
 *
 * `idempotent: true` — that is the whole point of the endpoint.
 */
const upsertContact: ActionDefinition<Input> = {
  key: "upsert-contact",
  type: "perform",
  resource: "contact",
  title: "Create or Update Contact",
  description:
    "Upsert a contact by email address: created if new, updated if it already exists. Safe to retry, unlike Create Contact.",
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
      key: "emailAddress",
      label: "Email address",
      type: "string",
      required: true,
      placeholder: "otto@example.com",
      hint: "The upsert key. An existing contact with this address is updated in place.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: CONTACT_STATUS_OPTIONS,
    },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON object keyed by field TAG — `{"FirstName": "Otto"}`. A `null` value removes that field from the contact.',
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint:
        'On this endpoint tags is an OBJECT, not an array: `{"vip": true, "old-tag": false}`. `true` adds, `false` removes, and unmentioned tags are left untouched.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "fields", type: "object", label: "Custom field values" },
    { key: "tags", type: "array", label: "Tags (an array on read, despite the object on write)" },
    { key: "status", type: "string", label: "subscribed | unsubscribed | pending" },
    { key: "last_updated_at", type: "string", label: "Last updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { email_address: input.emailAddress };
    if (input.status !== undefined) body.status = input.status;
    if (input.fields !== undefined) body.fields = input.fields;
    if (input.tags !== undefined) body.tags = input.tags;
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}/contacts`, {
      method: "PUT",
      body,
    });
  },
};

export default upsertContact;
