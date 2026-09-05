import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/**
 * `POST /api/v2/lists/{id}/contacts` (`clearAndAssignContactsToList`) —
 * **replaces** the list's membership with exactly the given contacts.
 *
 * The vendor's own `operationId` says what the plain summary ("Reset list
 * members to the specified contacts") does not make obvious at a glance: this
 * is not "add contacts to a list" — every existing member not named here is
 * **removed**. Pass `"all"` instead of a comma-separated id list to include
 * every contact the current user owns.
 *
 * Also one of the four endpoints TextMagic rate-limits to 5 requests/second
 * rather than the account-wide 50.
 */
interface Input {
  id: number;
  contacts: string;
}

const listSetContacts: ActionDefinition<Input> = {
  key: "list-set-contacts",
  type: "perform",
  resource: "list",
  title: "Set List Contacts (replaces membership)",
  description:
    "Replace a list's members with exactly the given contact IDs. This REMOVES any existing " +
    "member not included. Rate-limited to 5 requests/second.",
  idempotent: true,
  params: [
    { key: "id", label: "List ID", type: "number", required: true },
    {
      key: "contacts",
      label: "Contact IDs",
      type: "string",
      required: true,
      hint: 'Comma-separated contact IDs, or the literal "all" for every contact you own. ' +
        "Replaces the entire membership — this is not additive.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "href", type: "string", label: "URI of the list" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json(`/lists/${encodeURIComponent(input.id)}/contacts`, {
      method: "POST",
      body: { contacts: input.contacts },
    });
  },
};

export default listSetContacts;
