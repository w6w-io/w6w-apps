import type { ActionDefinition } from "@w6w/types";
import {
  CONTACT_STATUS_OPTIONS,
  type ContactStatus,
  EmailOctopusClient,
  seg,
} from "../lib/client.ts";

interface Input {
  listId: string;
  contactId: string;
  emailAddress?: string;
  status?: ContactStatus;
  fields?: Record<string, unknown>;
  tags?: Record<string, boolean>;
}

/**
 * `PUT /lists/{list_id}/contacts/{contact_id}` — update a contact addressed by
 * id (or by the MD5 of its lowercased email, which this path segment also
 * accepts).
 *
 * Despite being a PUT, the body is a **partial**: every attribute is optional
 * and omitting one leaves it unchanged. `tags` is the same `tag -> boolean`
 * OBJECT as on the upsert endpoint — see `upsert-contact` — not the array that
 * `create-contact` takes.
 *
 * `idempotent: true`: the body is a set of absolute assignments, so replaying
 * it converges.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update an existing contact by id. Every attribute is optional; omitted attributes are left unchanged.",
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
      key: "contactId",
      label: "Contact ID or email MD5",
      type: "string",
      required: true,
      hint: "The contact UUID, or the MD5 hash of the lowercased email address.",
    },
    {
      key: "emailAddress",
      label: "New email address",
      type: "string",
      hint: "Set only to change the address. Omit to leave it as-is.",
    },
    { key: "status", label: "Status", type: "select", options: CONTACT_STATUS_OPTIONS },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint: "JSON object keyed by field TAG. A `null` value removes that field.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint:
        'An OBJECT here, not an array: `{"vip": true, "old-tag": false}`. Unmentioned tags are left untouched.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "fields", type: "object", label: "Custom field values" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "status", type: "string", label: "subscribed | unsubscribed | pending" },
    { key: "last_updated_at", type: "string", label: "Last updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.emailAddress !== undefined) body.email_address = input.emailAddress;
    if (input.status !== undefined) body.status = input.status;
    if (input.fields !== undefined) body.fields = input.fields;
    if (input.tags !== undefined) body.tags = input.tags;
    return new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/contacts/${seg(input.contactId)}`,
      { method: "PUT", body },
    );
  },
};

export default updateContact;
