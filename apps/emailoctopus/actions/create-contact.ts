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
  tags?: string[];
}

/**
 * `POST /lists/{list_id}/contacts` — 201 with the new contact.
 *
 * **`tags` here is an ARRAY OF STRINGS.** On the two PUT endpoints
 * (`upsert-contact`, `update-contact`) the same attribute is an OBJECT of
 * `tag -> boolean`, where `false` removes the tag. Same field name, same
 * resource, two different JSON types depending on the verb; sending the wrong
 * one is a 422. The divergence is in EmailOctopus's own OpenAPI document, not
 * an inference.
 *
 * `idempotent: false` — a second call for an email address already on the list
 * is an `already-exists` conflict (409), not a no-op. Use `upsert-contact` when
 * a retry has to be safe.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Add a contact to a list. Fails with a 409 conflict if the email address is already on the list — use Create or Update Contact for upsert semantics.",
  idempotent: false,
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
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: CONTACT_STATUS_OPTIONS,
      hint:
        "Omit to let EmailOctopus decide from the list's double opt-in setting. `pending` sends the confirmation email.",
    },
    {
      key: "fields",
      label: "Custom fields",
      type: "json",
      hint:
        'JSON object keyed by each field\'s TAG, not its label — e.g. `{"FirstName": "Otto", "how_many_pets": 2}`. A `null` value removes the field.',
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint:
        'On CREATE this is a JSON array of tag names — `["vip", "beta"]`. The update actions take an object instead; see their hints.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "fields", type: "object", label: "Custom field values" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "status", type: "string", label: "subscribed | unsubscribed | pending" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = { email_address: input.emailAddress };
    if (input.status !== undefined) body.status = input.status;
    if (input.fields !== undefined) body.fields = input.fields;
    if (input.tags !== undefined) body.tags = input.tags;
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}/contacts`, {
      method: "POST",
      body,
    });
  },
};

export default createContact;
