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
 * `POST /contacts.update` — verified against
 * `developer.focus.teamleader.eu/docs/api/contacts-update` on 2026-09-01.
 * Returns `204 No Content`.
 *
 * **Collections are replaced wholesale, not merged.** Per
 * `docs/general-principles#updating-collections`: "Collections are replaced
 * entirely during updates, so all the wanted values should be provided when
 * updating entities. Other existing values which are not provided will be
 * removed." That applies here to `emails`, `telephones`, `addresses` and
 * `tags` — send the full desired set, not just what changed, or the rest is
 * deleted. `custom_fields` is the one documented exception: pass
 * `custom_fields_update_strategy: "partial"` to update only the custom fields
 * named in this call and leave the others untouched.
 */
interface Input {
  id: string;
  firstName?: string;
  lastName?: string;
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
  customFieldsUpdateStrategy?: "partial";
  marketingMailsConsent?: boolean;
}

const contactsUpdate: ActionDefinition<Input> = {
  key: "contacts-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  idempotent: true,
  description: "Update a contact. Collections (emails, telephones, addresses, tags) are " +
    "REPLACED wholesale — provide the full set you want, not just the change. Custom fields can " +
    "be updated partially instead, via `custom_fields_update_strategy`.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    emailsParam,
    { key: "salutation", label: "Salutation", type: "string" },
    telephonesParam,
    { key: "website", label: "Website", type: "string" },
    addressesParam,
    { key: "language", label: "Language", type: "string" },
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
    { key: "remarks", label: "Remarks", type: "text" },
    tagsParam,
    customFieldsParam,
    {
      key: "customFieldsUpdateStrategy",
      label: "Custom fields update strategy",
      type: "select",
      options: [{ value: "partial", label: "Partial — leave unlisted custom fields untouched" }],
      hint: "Leave empty to replace the whole custom_fields collection like every other array.",
    },
    { key: "marketingMailsConsent", label: "Marketing mails consent", type: "boolean" },
  ],
  output: [{ key: "id", type: "string", label: "Contact ID" }],

  async execute(input, ctx) {
    await call(
      ctx,
      "contacts.update",
      compact({
        id: input.id,
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
        custom_fields_update_strategy: input.customFieldsUpdateStrategy,
        marketing_mails_consent: input.marketingMailsConsent,
      }),
    );
    return { id: input.id };
  },
};

export default contactsUpdate;
