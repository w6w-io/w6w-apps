import type { ActionDefinition } from "@w6w/types";
import { parseJson, WatiClient } from "../lib/client.ts";

interface Input {
  contacts: unknown;
}

interface ContactDto {
  id?: string;
  wa_id?: string;
  name?: string;
  custom_params?: Array<{ name: string; value: string }>;
}

interface UpdateContactsResponse {
  contact_list?: ContactDto[];
}

/**
 * `PUT /api/ext/v3/contacts` — verified against the embedded OpenAPI document 2026-09-05. Sets
 * (replaces) custom parameters for one or more contacts in a single call.
 *
 * Each item's key is `customParams` (camelCase) — NOT the `custom_params` (snake_case)
 * `POST /api/ext/v3/contacts` (`contact-create`) documents for the same concept. See
 * `lib/client.ts` on why this is a real Wati inconsistency, passed through verbatim rather than
 * normalised.
 *
 * Marked idempotent: this sets custom-field values to whatever the caller supplies (a replace,
 * not an append), so calling it twice with the same input leaves the same end state.
 */
const action: ActionDefinition<Input, UpdateContactsResponse> = {
  key: "contacts-update",
  type: "perform",
  resource: "contacts",
  title: "Update Contacts",
  description: "Set custom parameters on one or more contacts in a single call.",
  idempotent: true,
  params: [
    {
      key: "contacts",
      label: "Contacts",
      type: "json",
      required: true,
      hint: 'A JSON array of `{"target": "...", "customParams": [{"name": "...", "value": ' +
        '"..."}]}` objects. `target` is a ContactId, PhoneNumber, or Channel:PhoneNumber.',
    },
  ],
  output: [{ key: "contact_list", label: "Updated Contacts", type: "array" }],

  async execute(input, ctx) {
    const contacts = parseJson(input.contacts, "contacts");
    ctx.log("info", "updating Wati contacts", {
      count: Array.isArray(contacts) ? contacts.length : undefined,
    });
    return await new WatiClient(ctx).put<UpdateContactsResponse>("/contacts", { contacts });
  },
};

export default action;
