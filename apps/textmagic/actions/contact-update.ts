import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient } from "../lib/client.ts";

/**
 * `PUT /api/v2/contacts/{id}/normalized` — edit a contact.
 *
 * Same body shape as `contact-create.ts`. This is one of the four endpoints
 * TextMagic rate-limits tighter than the account-wide 50/second: **5 requests
 * per second** — worth knowing before looping this over a large contact
 * import.
 */
interface Input {
  id: number;
  phone?: string;
  lists?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  favorited?: boolean;
  blocked?: boolean;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Edit a contact. Rate-limited to 5 requests/second, tighter than the account default.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
    { key: "phone", label: "Phone", type: "string", hint: "E.164 format." },
    { key: "lists", label: "List IDs", type: "string", hint: "Comma-separated." },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "favorited", label: "Favorited", type: "boolean" },
    { key: "blocked", label: "Blocked", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "href", type: "string", label: "URI of the updated contact" },
  ],

  execute(input, ctx) {
    const { id, ...body } = input;
    return new TextMagicClient(ctx).json(`/contacts/${encodeURIComponent(id)}/normalized`, {
      method: "PUT",
      body: compact(body),
    });
  },
};

export default contactUpdate;
