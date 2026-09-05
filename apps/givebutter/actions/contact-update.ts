import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GivebutterClient, toList } from "../lib/client.ts";
import { contactTypeOptions, genderOptions, numericIdParam } from "../lib/params.ts";

interface EmailEntry {
  value?: string;
  type?: string;
  is_primary?: boolean;
}
interface PhoneEntry {
  value?: string;
  type?: string;
  is_primary?: boolean;
}
interface AddressEntry {
  id?: number;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  is_primary?: boolean;
}

interface Input {
  id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  preferred_name?: string;
  gender?: string;
  pronouns?: string;
  suffix?: string;
  prefix?: string;
  type?: string;
  company_name?: string;
  employer?: string;
  company?: string;
  title?: string;
  twitter_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  website_url?: string;
  note?: string;
  bio?: string;
  external_id?: string;
  contact_since?: string;
  dob?: string;
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  address_subscription?: boolean;
  tags?: string;
  remove_emails?: string;
  remove_phones?: string;
  remove_address_ids?: string;
  emails?: string | EmailEntry[];
  phones?: string | PhoneEntry[];
  addresses?: string | AddressEntry[];
}

/**
 * `emails`/`phones`/`addresses` here are the RICH object shapes
 * (`{value, type, is_primary}` / an address with an `id`) — deliberately
 * different from `contact-create`'s plain string arrays, because Givebutter's
 * own `UpdateContactRequest` schema documents a different shape from
 * `StoreContactRequest` for the same-named fields. Passing create's flat
 * string form here would silently fail validation.
 */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Update a contact's fields. Only fields you set are changed.",
  idempotent: true,
  params: [
    numericIdParam("Contact"),
    { key: "type", label: "Type", type: "select", options: contactTypeOptions },
    { key: "first_name", label: "First name", type: "string", validation: { maxLength: 255 } },
    { key: "last_name", label: "Last name", type: "string", validation: { maxLength: 255 } },
    { key: "middle_name", label: "Middle name", type: "string", validation: { maxLength: 255 } },
    { key: "preferred_name", label: "Preferred name", type: "string" },
    { key: "company_name", label: "Company name", type: "string", validation: { maxLength: 255 } },
    { key: "gender", label: "Gender", type: "select", options: genderOptions },
    { key: "pronouns", label: "Pronouns", type: "string" },
    { key: "prefix", label: "Prefix", type: "string", validation: { maxLength: 32 } },
    { key: "suffix", label: "Suffix", type: "string", validation: { maxLength: 32 } },
    { key: "dob", label: "Date of birth", type: "date" },
    { key: "employer", label: "Employer", type: "string" },
    { key: "company", label: "Company (job context)", type: "string" },
    { key: "title", label: "Job title", type: "string" },
    { key: "external_id", label: "External ID", type: "string", validation: { maxLength: 255 } },
    { key: "contact_since", label: "Contact since", type: "datetime" },
    { key: "twitter_url", label: "Twitter URL", type: "string" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
    { key: "facebook_url", label: "Facebook URL", type: "string" },
    { key: "tiktok_url", label: "TikTok URL", type: "string" },
    { key: "website_url", label: "Website URL", type: "string", validation: { maxLength: 2048 } },
    { key: "note", label: "Note", type: "text" },
    { key: "bio", label: "Bio", type: "text", validation: { maxLength: 2000 } },
    { key: "email_opt_in", label: "Opted into email", type: "boolean" },
    { key: "sms_opt_in", label: "Opted into SMS", type: "boolean" },
    { key: "address_subscription", label: "Subscribed to mail", type: "boolean" },
    {
      key: "tags",
      label: "Tags (replaces the full set)",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'Array of {"value", "type", "is_primary"} objects.',
    },
    {
      key: "phones",
      label: "Phones",
      type: "json",
      hint: 'Array of {"value", "type", "is_primary"} objects.',
    },
    {
      key: "addresses",
      label: "Addresses",
      type: "json",
      hint: 'Array of {"id", "address_1", "address_2", "city", "state", "zipcode", "country", ' +
        '"is_primary"} objects. Include "id" to update an existing address.',
    },
    {
      key: "remove_emails",
      label: "Remove emails",
      type: "string",
      hint: "Comma-separated email values to remove.",
    },
    {
      key: "remove_phones",
      label: "Remove phones",
      type: "string",
      hint: "Comma-separated phone values to remove.",
    },
    {
      key: "remove_address_ids",
      label: "Remove address IDs",
      type: "string",
      hint: "Comma-separated address ids to remove.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "primary_email", type: "string", label: "Primary email" },
  ],

  async execute(input, ctx) {
    const body = compact({
      first_name: input.first_name,
      last_name: input.last_name,
      middle_name: input.middle_name,
      preferred_name: input.preferred_name,
      gender: input.gender,
      pronouns: input.pronouns,
      suffix: input.suffix,
      prefix: input.prefix,
      type: input.type,
      company_name: input.company_name,
      employer: input.employer,
      company: input.company,
      title: input.title,
      twitter_url: input.twitter_url,
      linkedin_url: input.linkedin_url,
      facebook_url: input.facebook_url,
      tiktok_url: input.tiktok_url,
      website_url: input.website_url,
      note: input.note,
      bio: input.bio,
      external_id: input.external_id,
      contact_since: input.contact_since,
      dob: input.dob,
      email_opt_in: input.email_opt_in,
      sms_opt_in: input.sms_opt_in,
      address_subscription: input.address_subscription,
      tags: toList(input.tags),
      remove_emails: toList(input.remove_emails),
      remove_phones: toList(input.remove_phones),
      remove_address_ids: toList(input.remove_address_ids),
      emails: asOptionalJson<EmailEntry[]>(input.emails, "emails"),
      phones: asOptionalJson<PhoneEntry[]>(input.phones, "phones"),
      addresses: asOptionalJson<AddressEntry[]>(input.addresses, "addresses"),
    });
    return await new GivebutterClient(ctx).data(`/contacts/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default contactUpdate;
