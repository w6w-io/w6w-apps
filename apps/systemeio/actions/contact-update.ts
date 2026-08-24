import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { contactFieldsParam, localeOptions } from "../lib/params.ts";

interface FieldInput {
  slug: string;
  value?: string | null;
}

interface Input {
  id: string;
  locale?: string;
  fields?: FieldInput[];
}

/**
 * `PATCH /api/contacts/{id}` — sent as `application/merge-patch+json` (see
 * `lib/client.ts`). Note there is no `email` field in the vendor's own patch
 * schema (`Contact.ContactInput-api_contacts_patch`) — email is set only at
 * create time and cannot be changed through this endpoint.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a Contact's locale and/or custom fields. Email cannot be changed — the vendor's " +
    "own patch schema has no email property.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "locale", label: "Locale", type: "select", options: localeOptions },
    contactFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "fields", type: "array", label: "Custom fields" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).patch(
      `/api/contacts/${encodeURIComponent(input.id)}`,
      compact({ locale: input.locale, fields: input.fields }),
    );
  },
};

export default contactUpdate;
