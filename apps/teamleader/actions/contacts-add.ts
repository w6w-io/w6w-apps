import type { ActionDefinition } from "@w6w/types";
import { call, compact } from "../lib/client.ts";
import {
  addressesParam,
  customFieldsParam,
  emailsParam,
  tagsParam,
  telephonesParam,
} from "../lib/params.ts";

/**
 * `POST /contacts.add` — verified against
 * `developer.focus.teamleader.eu/docs/api/contacts-add` on 2026-09-01.
 *
 * Returns `201` with `{"data": {"type": "contact", "id": "…"}}`.
 */
interface Input {
  firstName?: string;
  lastName: string;
  emails?: unknown[];
  salutation?: string;
  telephones?: unknown[];
  website?: string;
  addresses?: unknown[];
  language?: string;
  gender?: "female" | "male" | "non_binary" | "prefers_not_to_say" | "unknown";
  birthdate?: string;
  remarks?: string;
  tags?: string[];
  customFields?: unknown[];
  marketingMailsConsent?: boolean;
}

const contactsAdd: ActionDefinition<Input> = {
  key: "contacts-add",
  type: "perform",
  resource: "contact",
  title: "Add Contact",
  idempotent: false,
  description: "Create a new contact. Each call creates a new record — Teamleader publishes no " +
    "upsert-by-email endpoint, so de-duplicate with Contacts List before calling this if that " +
    "matters to your workflow.",
  params: [
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string", required: true },
    emailsParam,
    { key: "salutation", label: "Salutation", type: "string", placeholder: "Mr" },
    telephonesParam,
    { key: "website", label: "Website", type: "string" },
    addressesParam,
    { key: "language", label: "Language", type: "string", placeholder: "en" },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: [
        { value: "female", label: "Female" },
        { value: "male", label: "Male" },
        { value: "non_binary", label: "Non-binary" },
        { value: "prefers_not_to_say", label: "Prefers not to say" },
        { value: "unknown", label: "Unknown" },
      ],
    },
    { key: "birthdate", label: "Birthdate", type: "date" },
    {
      key: "remarks",
      label: "Remarks",
      type: "text",
      hint: "Background information, in Markdown.",
    },
    tagsParam,
    customFieldsParam,
    { key: "marketingMailsConsent", label: "Marketing mails consent", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "New contact ID" },
    { key: "type", type: "string", label: 'Resource type ("contact")' },
  ],

  async execute(input, ctx) {
    const result = await call<{ id: string; type: string }>(
      ctx,
      "contacts.add",
      compact({
        first_name: input.firstName,
        last_name: input.lastName,
        emails: input.emails,
        salutation: input.salutation,
        telephones: input.telephones,
        website: input.website,
        addresses: input.addresses,
        language: input.language,
        gender: input.gender,
        birthdate: input.birthdate,
        remarks: input.remarks,
        tags: input.tags,
        custom_fields: input.customFields,
        marketing_mails_consent: input.marketingMailsConsent,
      }),
    );
    return result;
  },
};

export default contactsAdd;
