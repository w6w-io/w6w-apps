import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { fieldsParam, filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/contacts` — List Contacts.
 *
 * ## The filter grammar is the whole endpoint
 *
 * Keap declares exactly five query parameters here — `filter`, `page_token`,
 * `order_by`, `page_size`, `fields` — and *every* search term goes inside the
 * one `filter` string as `field==value`, clauses joined by `;`. There is no
 * `?email=` parameter. Sending one is not an error and not a filter: it is
 * ignored, and the call returns the whole contact list. The typed params below
 * build the common clauses; `filter` takes the rest verbatim.
 *
 * ## `phone_number` needs a companion parameter
 *
 * The one clause that cannot be used alone. Keap: "`phone_number` — the phone
 * number to search for. Requires `phone_fields` to be specified; only the
 * specified phone fields are searched." So a phone search without
 * `phone_fields` searches nothing. This action refuses that combination up
 * front rather than returning a confidently empty list.
 */
interface Input {
  email?: string;
  givenName?: string;
  familyName?: string;
  companyId?: string;
  ids?: string;
  phoneNumber?: string;
  phoneFields?: string;
  sinceUpdateTime?: string;
  untilUpdateTime?: string;
  filter?: string;
  orderBy?: string;
  fields?: string;
  pageSize?: number;
  pageToken?: string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  title: "List Contacts",
  resource: "contact",
  description:
    "Search contacts by email, name, company, id or last-update window, using Keap's filter " +
    "expression grammar.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Exact match, or a prefix with a trailing `*` (e.g. `john*`).",
    },
    {
      key: "givenName",
      label: "First name",
      type: "string",
      hint: "Trailing `*` matches a prefix.",
    },
    {
      key: "familyName",
      label: "Last name",
      type: "string",
      hint: "Trailing `*` matches a prefix.",
    },
    { key: "companyId", label: "Company ID", type: "string" },
    {
      key: "ids",
      label: "Contact IDs",
      type: "string",
      placeholder: "1,2,3",
      hint: "Comma-separated list of contact ids to fetch in one call.",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      advanced: true,
      hint: "Requires the phone fields below — Keap searches only the fields you name.",
    },
    {
      key: "phoneFields",
      label: "Phone fields to search",
      type: "string",
      advanced: true,
      placeholder: "PHONE1,PHONE2",
      hint: "One or more of PHONE1..PHONE5, comma-separated. Required whenever a phone number is " +
        "given.",
    },
    {
      key: "sinceUpdateTime",
      label: "Updated since",
      type: "datetime",
      advanced: true,
      hint: "ISO-8601 with milliseconds and an offset, e.g. 2026-01-01T00:00:00.000Z. Keap " +
        "rejects a date-only value.",
    },
    { key: "untilUpdateTime", label: "Updated until", type: "datetime", advanced: true },
    filterParam,
    orderByParam("One of `id`, `create_time`, `email`, `update_time`, plus `asc` or `desc`."),
    fieldsParam(
      "Available: addresses, anniversary_date, birth_date, company, contact_type, create_time, " +
        "custom_fields, email_addresses, family_name, fax_numbers, given_name, id, job_title, " +
        "leadsource_id, links, middle_name, notes, origin, owner_id, phone_numbers, " +
        "preferred_locale, preferred_name, prefix, referral_code, score_value, social_accounts, " +
        "source_type, spouse_name, suffix, tag_ids, time_zone, update_time, utm_parameters, " +
        "website, account_id, assistant_name, assistant_phone, billing_information, created_by, " +
        "groups, last_updated_by.",
    ),
    ...pageParams(),
  ],
  output: [
    { key: "contacts", type: "array", label: "Contacts" },
    { key: "count", type: "number", label: "Contacts returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    if (input.phoneNumber && !input.phoneFields) {
      throw new Error(
        "Phone fields to search is required when a phone number is given — Keap searches only " +
          "the phone fields you name, so omitting it silently matches nothing.",
      );
    }

    const filter = joinFilters([
      eq("email", input.email),
      eq("given_name", input.givenName),
      eq("family_name", input.familyName),
      eq("company_id", input.companyId),
      eq("ids", input.ids),
      eq("phone_number", input.phoneNumber),
      eq("phone_fields", input.phoneFields),
      eq("start_update_time", input.sinceUpdateTime),
      eq("end_update_time", input.untilUpdateTime),
      input.filter,
    ]);

    const client = new KeapClient(ctx);
    const body = await client.json<{ contacts?: unknown[]; next_page_token?: string }>(
      `${V2}/contacts`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          fields: input.fields,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );

    const contacts = body?.contacts ?? [];
    return { contacts, count: contacts.length, nextPageToken: nextPageToken(body) };
  },
};

export default contactList;
