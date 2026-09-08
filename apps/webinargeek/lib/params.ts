import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the WebinarGeek actions. Every option list here is copied
 * verbatim from the vendor's own API Blueprint (`https://jsapi.apiary.io/apis/webinargeek.apib`,
 * fetched 2026-09-06), not inferred.
 */

/**
 * `page`/`per_page` — identical shape on every list endpoint (unlike many vendors in this pack,
 * WebinarGeek does not vary the page-size parameter's name per resource).
 */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-indexed — WebinarGeek's first page is page 1, not 0.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Maximum 1000 (raised from 100 on 2023-05-22). WebinarGeek's own default is 50.",
    },
  ];
}

/** `order`/`sort` — the option set and default differ per resource, so both are parameters. */
export function orderSortParams(
  orderOptions: Array<{ value: string; label: string }>,
  defaultOrder: string,
): Param[] {
  return [
    {
      key: "order",
      label: "Order by",
      type: "select",
      default: defaultOrder,
      options: orderOptions,
    },
    {
      key: "sort",
      label: "Sort direction",
      type: "select",
      default: "desc",
      options: [
        { value: "desc", label: "Descending" },
        { value: "asc", label: "Ascending" },
      ],
    },
  ];
}

/** `webinar_id`/`episode_id`/`broadcast_id` — the three scoping filters shared by several lists. */
export function scopeFilterParams(): Param[] {
  return [
    { key: "webinarId", label: "Webinar ID", type: "number", hint: "Filter by webinar." },
    { key: "episodeId", label: "Episode ID", type: "number", hint: "Filter by episode." },
    { key: "broadcastId", label: "Broadcast ID", type: "number", hint: "Filter by broadcast." },
  ];
}

export const languageOptions = [
  { value: "nl", label: "Dutch" },
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fi", label: "Finnish" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "es", label: "Spanish" },
  { value: "pl", label: "Polish" },
  { value: "sv", label: "Swedish" },
  { value: "da", label: "Danish" },
  { value: "nb", label: "Norwegian Bokmål" },
  { value: "cs", label: "Czech" },
  { value: "sk", label: "Slovak" },
  { value: "tr", label: "Turkish" },
  { value: "et", label: "Estonian" },
  { value: "sl", label: "Slovenian" },
];

export const episodeTypeOptions = [
  { value: "live", label: "Live" },
  { value: "automated", label: "Automated" },
  { value: "ondemand", label: "On demand" },
];

export const messageTypeOptions = [
  { value: "public", label: "Public chat" },
  { value: "private", label: "Private chat" },
  { value: "question", label: "Question box" },
];

/**
 * `Subscription Base` — the fields WebinarGeek accepts when registering someone for a broadcast
 * (`POST /broadcasts/{id}/subscriptions`) or a whole series (`POST /webinars/{id}/series_subscribe`).
 * Only `firstname` and `email` are required — matching the two general registration fields every
 * new webinar starts with.
 *
 * Per the spec's own "Resource validations & restrictions" section: extra registration fields and
 * consent fields configured as required on the webinar are **not enforced** through this API,
 * because the subscriber cannot give consent when registered on their behalf. `extraFields` and
 * `consentFields` are therefore both optional free-form JSON here, matching the vendor's own
 * "not validated" behavior rather than pretending this app can enforce what WebinarGeek itself
 * does not.
 */
export function subscriptionBaseParams(): Param[] {
  return [
    { key: "firstname", label: "First name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "surname", label: "Surname", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "street", label: "Street", type: "string" },
    { key: "houseNumber", label: "House number", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "postcode", label: "Postcode", type: "string" },
    { key: "province", label: "Province", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "ISO country code, e.g. NL." },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      hint: "ID used to identify this subscriber in your own system.",
    },
    {
      key: "timeZone",
      label: "Time zone",
      type: "string",
      hint: "tz database name, e.g. Europe/Amsterdam. Defaults to the webinar/account time zone.",
    },
    {
      key: "customField",
      label: "Custom field",
      type: "string",
      hint: "Free-form value, e.g. a campaign ID.",
    },
    {
      key: "extraFields",
      label: "Extra registration fields",
      type: "json",
      advanced: true,
      hint: 'Key/value pairs keyed by field name, e.g. {"extra_field_3": "Yes"}. Names come ' +
        "from the webinar's own `registration_fields` (GET a webinar to see them). Not validated " +
        "or enforced by WebinarGeek when set through the API.",
    },
    {
      key: "consentFields",
      label: "Consent fields",
      type: "json",
      advanced: true,
      hint: 'Key/value pairs keyed by the consent label, e.g. {"Privacy policy": "I consent."}. ' +
        "Not validated or enforced by WebinarGeek when set through the API — the subscriber must " +
        "already have given consent elsewhere.",
    },
    {
      key: "skipConfirmationMail",
      label: "Skip confirmation email",
      type: "boolean",
      default: false,
      advanced: true,
    },
  ];
}

/** Builds the wire body for `Subscription Base` from this app's camelCase action input. */
export function subscriptionBaseBody(input: {
  firstname: string;
  email: string;
  surname?: string;
  company?: string;
  jobTitle?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  postcode?: string;
  province?: string;
  country?: string;
  phone?: string;
  externalId?: string;
  timeZone?: string;
  customField?: string;
  extraFields?: Record<string, unknown>;
  consentFields?: Record<string, unknown>;
  skipConfirmationMail?: boolean;
}): Record<string, unknown> {
  return {
    firstname: input.firstname,
    email: input.email,
    surname: input.surname,
    company: input.company,
    job_title: input.jobTitle,
    street: input.street,
    house_number: input.houseNumber,
    city: input.city,
    postcode: input.postcode,
    province: input.province,
    country: input.country,
    phone: input.phone,
    external_id: input.externalId,
    time_zone: input.timeZone,
    custom_field: input.customField,
    extra_fields: input.extraFields,
    consent_fields: input.consentFields,
    skip_confirmation_mail: input.skipConfirmationMail,
  };
}
