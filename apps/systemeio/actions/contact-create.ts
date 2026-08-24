import type { ActionDefinition } from "@w6w/types";
import { compact, SystemeClient } from "../lib/client.ts";
import { contactFieldsParam, localeOptions } from "../lib/params.ts";

interface FieldInput {
  slug: string;
  value?: string | null;
}

interface Input {
  email: string;
  locale?: string;
  fields?: FieldInput[];
}

/**
 * `POST /api/contacts`.
 *
 * The vendor's own description is worth carrying verbatim: "Contacts are not
 * immediately removed upon deletion. For security reasons, the actual deletion
 * of contact data may take several days. If you add a new contact using the
 * same email address as a recently deleted one, the new contact might inherit
 * certain properties from the previously deleted contact." — a re-create
 * shortly after a delete is not guaranteed to start from a blank slate.
 */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a Contact resource. Re-creating a recently deleted email may inherit some of its " +
    "prior properties — deletion is not immediate on systeme.io's side.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "locale", label: "Locale", type: "select", options: localeOptions },
    contactFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "registeredAt", type: "string", label: "Registered at" },
    { key: "locale", type: "string", label: "Locale" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "fields", type: "array", label: "Custom fields" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post(
      "/api/contacts",
      compact({ email: input.email, locale: input.locale, fields: input.fields }),
    );
  },
};

export default contactCreate;
