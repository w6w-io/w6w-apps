import type { ActionDefinition } from "@w6w/types";
import { encodeId, KeapClient, V2 } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `GET /rest/v2/contacts/{contact_id}` — Retrieve a Contact.
 *
 * The `fields` selector is worth setting. Keap returns a lean projection by
 * default and an absent property means "not requested", not "not set" — so
 * checking `contact.custom_fields` without having asked for `custom_fields`
 * reads as "this contact has no custom fields" when it has twenty.
 */
interface Input {
  contactId: string;
  fields?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  title: "Get Contact",
  resource: "contact",
  description: "Retrieve a single contact by id.",
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    fieldsParam(
      "Available: addresses, anniversary_date, birth_date, company, contact_type, create_time, " +
        "custom_fields, email_addresses, family_name, fax_numbers, given_name, id, job_title, " +
        "leadsource_id, links, middle_name, notes, origin, owner_id, phone_numbers, " +
        "preferred_locale, preferred_name, prefix, referral_code, score_value, social_accounts, " +
        "source_type, spouse_name, suffix, tag_ids, time_zone, update_time, utm_parameters, " +
        "website, account_id, assistant_name, assistant_phone, billing_information, created_by, " +
        "groups, last_updated_by. An absent property means it was not requested.",
    ),
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "given_name", type: "string", label: "First name" },
    { key: "family_name", type: "string", label: "Last name" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
  ],

  execute(input, ctx) {
    const client = new KeapClient(ctx);
    return client.json(`${V2}/contacts/${encodeId(input.contactId)}`, {
      query: { fields: input.fields },
    });
  },
};

export default contactGet;
