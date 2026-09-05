import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient } from "../lib/client.ts";

/**
 * `POST /api/v2/contacts/normalized` — add a contact.
 *
 * `phone` and `lists` are **both required by the vendor's own schema** — every
 * contact must be assigned to at least one list (comma-separated list IDs) at
 * creation time. There is no way to create an unlisted contact through this
 * endpoint.
 *
 * Returns `{id, href}` (a `ResourceLinkResponse`), not the created contact —
 * follow up with `contact-get` for the full record.
 */
interface Input {
  phone: string;
  lists: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  favorited?: boolean;
  blocked?: boolean;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Add a contact to one or more lists.",
  idempotent: false,
  params: [
    {
      key: "phone",
      label: "Phone",
      type: "string",
      required: true,
      hint: "E.164 format, e.g. 447860021130.",
    },
    {
      key: "lists",
      label: "List IDs",
      type: "string",
      required: true,
      hint: "Comma-separated list IDs. Every contact must belong to at least one list.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "favorited", label: "Favorited", type: "boolean", default: false },
    { key: "blocked", label: "Blocked", type: "boolean", default: false },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "href", type: "string", label: "URI of the created contact" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json("/contacts/normalized", {
      method: "POST",
      body: compact({ ...input }),
    });
  },
};

export default contactCreate;
