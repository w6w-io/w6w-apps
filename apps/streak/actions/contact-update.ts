import type { ActionDefinition } from "@w6w/types";
import { contactKeyParam } from "../lib/params.ts";
import { encodeId, StreakClient } from "../lib/client.ts";

/** `POST /contacts/{contactKey}` — edit a contact. No trailing slash, unlike `contact-create`. */
interface Input {
  contactKey: string;
  givenName?: string;
  familyName?: string;
  title?: string;
  emailAddresses?: string[];
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Edit a contact's name, title or email addresses.",
  idempotent: true,
  params: [
    contactKeyParam,
    { key: "givenName", label: "First Name", type: "string" },
    { key: "familyName", label: "Last Name", type: "string" },
    { key: "title", label: "Job Title", type: "string" },
    {
      key: "emailAddresses",
      label: "Email Addresses",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated contact" }],

  execute(input, ctx) {
    const { contactKey, ...body } = input;
    return new StreakClient(ctx).sendJson("POST", `/contacts/${encodeId(contactKey)}`, body);
  },
};

export default contactUpdate;
