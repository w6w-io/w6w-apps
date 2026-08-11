import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  contactId: string;
}

/**
 * `GET /lists/{list_id}/contacts/{contact_id}`.
 *
 * `contact_id` accepts **either** the contact's UUID **or** the MD5 hash of the
 * lowercased email address — the spec says so explicitly and its example
 * (`631251b876fece73bc9dd647fe596d5f`) is a hash, not a UUID. That is the
 * documented way to look a contact up by email, because the v2 API has no
 * `?email_address=` filter on the contacts collection. This app does not hash
 * for you: it has no crypto in the sandbox and would only be guessing at the
 * normalisation, so the caller passes whichever identifier they hold.
 */
const getContact: ActionDefinition<Input> = {
  key: "get-contact",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch a single contact from a list by its id, or by the MD5 hash of its lowercased email address — EmailOctopus accepts either in the same path segment.",
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
      hint:
        "The contact UUID, or the MD5 hash of the lowercased email address (EmailOctopus's documented email lookup).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "email_address", type: "string", label: "Email address" },
    { key: "fields", type: "object", label: "Custom field values, keyed by field tag" },
    { key: "tags", type: "array", label: "Tags (an array on read)" },
    { key: "status", type: "string", label: "subscribed | unsubscribed | pending" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
    { key: "last_updated_at", type: "string", label: "Last updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/contacts/${seg(input.contactId)}`,
    );
  },
};

export default getContact;
