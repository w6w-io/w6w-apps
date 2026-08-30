import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts` — create a contact for the workspace.
 *
 * `customFields` (per-workspace custom properties, listed by `contact-custom-field-list`) can
 * only be DEFINED inside the Quo app itself — the API can only set VALUES for fields that
 * already exist. Exposed here as raw JSON (`[{key, value}]`, `value` matching the field's own
 * type: string/number/boolean/string[]) rather than a fixed param set, since the shape depends
 * entirely on what custom fields this workspace happens to have defined.
 *
 * Not idempotent — Quo documents no idempotency key or upsert-by-`externalId` semantics for
 * this endpoint; a retry creates a second contact.
 */
interface Input {
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  emails?: Array<{ name: string; value: string }>;
  phoneNumbers?: Array<{ name: string; value: string }>;
  customFields?: unknown;
  externalId?: string;
  source?: string;
  sourceUrl?: string;
  createdByUserId?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact for the workspace.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", hint: "The contact's first name." },
    { key: "lastName", label: "Last name", type: "string", hint: "The contact's last name." },
    { key: "company", label: "Company", type: "string" },
    { key: "role", label: "Role", type: "string" },
    {
      key: "emails",
      label: "Emails",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          {
            key: "name",
            label: "Label",
            type: "string",
            required: true,
            placeholder: "company email",
          },
          { key: "value", label: "Address", type: "string", required: true },
        ],
      },
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          {
            key: "name",
            label: "Label",
            type: "string",
            required: true,
            placeholder: "company phone",
          },
          {
            key: "value",
            label: "Number",
            type: "string",
            required: true,
            placeholder: "+12345678901",
          },
        ],
      },
    },
    {
      key: "customFields",
      label: "Custom fields (JSON)",
      type: "json",
      advanced: true,
      hint: "Array of `{key, value}` matching this workspace's custom field definitions " +
        "(see List Contact Custom Fields). Field definitions themselves can only be created " +
        "in the Quo app, not via the API.",
    },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "Your own identifier for this contact, e.g. a CRM record ID.",
    },
    { key: "source", label: "Source", type: "string", advanced: true },
    { key: "sourceUrl", label: "Source URL", type: "string", advanced: true },
    {
      key: "createdByUserId",
      label: "Created by user ID",
      type: "string",
      advanced: true,
      placeholder: "US123abc",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Contact (id, externalId, source, sourceUrl, defaultFields, customFields, " +
        "createdAt, updatedAt, createdByUserId)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/contacts", {
      method: "POST",
      body: {
        defaultFields: {
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company,
          role: input.role,
          emails: input.emails,
          phoneNumbers: input.phoneNumbers,
        },
        customFields: input.customFields,
        externalId: input.externalId,
        source: input.source,
        sourceUrl: input.sourceUrl,
        createdByUserId: input.createdByUserId,
      },
    });
  },
};

export default contactCreate;
