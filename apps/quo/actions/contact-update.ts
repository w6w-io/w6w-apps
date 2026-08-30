import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `PATCH /v1/contacts/{id}` — update a contact.
 *
 * ## A PATCH that REPLACES, not merges — verified against Quo's own description
 *
 * "This endpoint replaces the contact rather than merging into it: any defaultFields.emails,
 * defaultFields.phoneNumbers or customFields you omit from the request body is deleted on the
 * contact." A caller must send the FULL set of emails/phone numbers/custom fields it wants the
 * contact to end up with — not just the ones changing — or the omitted ones are silently
 * dropped. `idempotent: true` because resending the same full body reliably reproduces the same
 * end state.
 */
interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  role?: string;
  emails?: Array<{ name: string; value: string; id?: string }>;
  phoneNumbers?: Array<{ name: string; value: string; id?: string }>;
  customFields?: unknown;
  externalId?: string;
  source?: string;
  sourceUrl?: string;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Replace a contact's fields. This REPLACES rather than merges: always send the " +
    "full set of emails, phone numbers and custom fields you want the contact to have — any " +
    "you omit are deleted.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "role", label: "Role", type: "string" },
    {
      key: "emails",
      label: "Emails (full replacement set)",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Label", type: "string", required: true },
          { key: "value", label: "Address", type: "string", required: true },
          { key: "id", label: "Existing email ID", type: "string" },
        ],
      },
      hint: "Every email the contact should have after this call — omitted ones are deleted.",
    },
    {
      key: "phoneNumbers",
      label: "Phone numbers (full replacement set)",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Label", type: "string", required: true },
          { key: "value", label: "Number", type: "string", required: true },
          { key: "id", label: "Existing phone ID", type: "string" },
        ],
      },
      hint: "Every phone number the contact should have after this call — omitted ones are " +
        "deleted.",
    },
    {
      key: "customFields",
      label: "Custom fields (JSON, full replacement set)",
      type: "json",
      advanced: true,
      hint: "Array of `{key, value, id?}` — every custom field value the contact should have " +
        "after this call.",
    },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    { key: "source", label: "Source", type: "string", advanced: true },
    { key: "sourceUrl", label: "Source URL", type: "string", advanced: true },
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
    return new QuoClient(ctx).json(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
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
      },
    });
  },
};

export default contactUpdate;
