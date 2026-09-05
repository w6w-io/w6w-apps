import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GivebutterClient, toList } from "../lib/client.ts";
import { contactTypeOptions, genderOptions } from "../lib/params.ts";

interface Address {
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

interface Input {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  preferred_name?: string;
  primary_email?: string;
  primary_phone?: string;
  company_name?: string;
  external_id?: string;
  contact_since?: string;
  type?: string;
  gender?: string;
  pronouns?: string;
  suffix?: string;
  prefix?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
  emails?: string;
  phones?: string;
  dob?: string;
  employer?: string;
  company?: string;
  title?: string;
  twitter_url?: string;
  linkedin_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
  instagram_url?: string;
  note?: string;
  email_subscription?: boolean;
  phone_subscription?: boolean;
  address_subscription?: boolean;
  tags?: string;
  addresses?: string | Address[];
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. Individual contacts need first_name/last_name; company contacts need " +
    "company_name.",
  idempotent: false,
  params: [
    { key: "type", label: "Type", type: "select", options: contactTypeOptions },
    { key: "first_name", label: "First name", type: "string", validation: { maxLength: 255 } },
    { key: "last_name", label: "Last name", type: "string", validation: { maxLength: 255 } },
    { key: "middle_name", label: "Middle name", type: "string", validation: { maxLength: 255 } },
    { key: "preferred_name", label: "Preferred name", type: "string" },
    { key: "company_name", label: "Company name", type: "string", validation: { maxLength: 255 } },
    { key: "primary_email", label: "Primary email", type: "string" },
    { key: "emails", label: "Additional emails", type: "string", hint: "Comma-separated." },
    { key: "primary_phone", label: "Primary phone", type: "string" },
    { key: "phones", label: "Additional phones", type: "string", hint: "Comma-separated." },
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
    { key: "address_1", label: "Address line 1", type: "string" },
    { key: "address_2", label: "Address line 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State", type: "string" },
    { key: "zipcode", label: "Zip code", type: "string" },
    { key: "country", label: "Country", type: "string" },
    {
      key: "addresses",
      label: "Additional addresses",
      type: "json",
      hint: 'Array of {"address_1", "address_2", "city", "state", "zipcode", "country"} objects.',
    },
    { key: "twitter_url", label: "Twitter URL", type: "string" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "string" },
    { key: "facebook_url", label: "Facebook URL", type: "string" },
    { key: "tiktok_url", label: "TikTok URL", type: "string" },
    { key: "instagram_url", label: "Instagram URL", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "email_subscription", label: "Subscribed to email", type: "boolean" },
    { key: "phone_subscription", label: "Subscribed to SMS", type: "boolean" },
    { key: "address_subscription", label: "Subscribed to mail", type: "boolean" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated, max 64 chars each." },
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
      primary_email: input.primary_email,
      primary_phone: input.primary_phone,
      company_name: input.company_name,
      external_id: input.external_id,
      contact_since: input.contact_since,
      type: input.type,
      gender: input.gender,
      pronouns: input.pronouns,
      suffix: input.suffix,
      prefix: input.prefix,
      address_1: input.address_1,
      address_2: input.address_2,
      city: input.city,
      state: input.state,
      zipcode: input.zipcode,
      country: input.country,
      emails: toList(input.emails),
      phones: toList(input.phones),
      dob: input.dob,
      employer: input.employer,
      company: input.company,
      title: input.title,
      twitter_url: input.twitter_url,
      linkedin_url: input.linkedin_url,
      facebook_url: input.facebook_url,
      tiktok_url: input.tiktok_url,
      instagram_url: input.instagram_url,
      note: input.note,
      email_subscription: input.email_subscription,
      phone_subscription: input.phone_subscription,
      address_subscription: input.address_subscription,
      tags: toList(input.tags),
      addresses: asOptionalJson<Address[]>(input.addresses, "addresses"),
    });
    return await new GivebutterClient(ctx).data("/contacts", { method: "POST", body });
  },
};

export default contactCreate;
