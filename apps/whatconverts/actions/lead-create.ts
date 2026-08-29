import type { ActionDefinition, Param } from "@w6w/types";
import { asOptionalJson, boolParam, compact, WhatConvertsClient } from "../lib/client.ts";
import { LEAD_OUTPUT_FIELDS, LEAD_TYPES } from "../lib/lead-fields.ts";

interface Input {
  profileId?: number;
  sendNotification?: boolean;
  leadType: string;
  dateCreated?: string;
  quotable?: "yes" | "no" | "pending" | "not_set";
  quoteValue?: number;
  salesValue?: number;
  wcClientCurrent?: string;
  leadSource?: string;
  leadMedium?: string;
  leadCampaign?: string;
  leadContent?: string;
  leadKeyword?: string;
  ipAddress?: string;
  emailAddress?: string;
  phoneNumber?: string;
  userId?: string;
  gclid?: string;
  msclkid?: string;
  fbclid?: string;
  fbpid?: string;
  leadUrl?: string;
  landingUrl?: string;
  operatingSystem?: string;
  browser?: string;
  deviceType?: string;
  deviceMake?: string;
  formName?: string;
  phoneName?: string;
  trackingNumber?: string;
  destinationNumber?: string;
  callerNumber?: string;
  callerName?: string;
  callDurationSeconds?: number;
  city?: string;
  zip?: string;
  state?: string;
  country?: string;
  answerStatus?: "Answered" | "No Answer" | "Busy";
  lineType?: string;
  callTranscription?: string;
  voicemailTranscription?: string;
  message?: string;
  eventCategory?: string;
  eventAction?: string;
  eventLabel?: string;
  transactionId?: string;
  transactionTax?: number;
  transactionShipping?: number;
  senderName?: string;
  emailSubject?: string;
  emailMessage?: string;
  additionalFields?: unknown;
  customFields?: unknown;
}

/** Params shared verbatim between create and edit for the type-specific fields. */
export const LEAD_TYPE_FIELDS: Param[] = [
  {
    key: "answerStatus",
    label: "Answer status",
    type: "select",
    options: [
      { value: "Answered", label: "Answered" },
      { value: "No Answer", label: "No Answer" },
      { value: "Busy", label: "Busy" },
    ],
    advanced: true,
    hint: "phone_call.",
  },
  {
    key: "lineType",
    label: "Line type",
    type: "string",
    advanced: true,
    hint: "phone_call, text_message.",
  },
  {
    key: "callTranscription",
    label: "Call transcription",
    type: "text",
    advanced: true,
    hint: "phone_call.",
  },
  {
    key: "voicemailTranscription",
    label: "Voicemail transcription",
    type: "text",
    advanced: true,
    hint: "phone_call.",
  },
  { key: "message", label: "Message", type: "text", advanced: true, hint: "text_message." },
  { key: "eventCategory", label: "Event category", type: "string", advanced: true, hint: "event." },
  { key: "eventAction", label: "Event action", type: "string", advanced: true, hint: "event." },
  { key: "eventLabel", label: "Event label", type: "string", advanced: true, hint: "event." },
  {
    key: "transactionId",
    label: "Transaction ID",
    type: "string",
    advanced: true,
    hint: "transaction.",
  },
  {
    key: "transactionTax",
    label: "Transaction tax",
    type: "number",
    advanced: true,
    hint: "transaction.",
  },
  {
    key: "transactionShipping",
    label: "Transaction shipping",
    type: "number",
    advanced: true,
    hint: "transaction.",
  },
  { key: "senderName", label: "Sender name", type: "string", advanced: true, hint: "email." },
  { key: "emailSubject", label: "Email subject", type: "string", advanced: true, hint: "email." },
  { key: "emailMessage", label: "Email message", type: "text", advanced: true, hint: "email." },
];

/**
 * `POST /leads` — create a lead. Verified against `whatconverts.com/api/leads/` on
 * 2026-08-29.
 *
 * `profile_id` is documented as required in the parameter table, but the same page's prose
 * says "Profile ID is not required when using a Profile Key" — a Profile Key already scopes
 * every write to its one profile. This app follows the prose: `profileId` is optional here
 * and required only for a Master Account (agency) Key connection.
 *
 * `wc_client_current` is WhatConverts's own visitor-attribution cookie; when set, the
 * vendor OVERRIDES `lead_source`/`lead_medium`/`lead_campaign`/`lead_content`/`lead_keyword`/
 * `gclid`/`msclkid`/`user_id`/`landing_url` from the cookie regardless of what this action
 * also sends for those fields — so a workflow supplying both is deferring to the cookie, per
 * the vendor's own documented precedence, not this app's.
 *
 * `additional_fields`/`custom_fields` are WhatConverts's per-profile custom field maps
 * (`{"Company Name": "Acme"}`); accepted here as `json` so any field name works without a
 * dedicated param per customer.
 *
 * The request body is sent as JSON — see `../lib/client.ts` for why that is inferred rather
 * than vendor-stated for this specific resource.
 */
const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new lead (call, form, chat, email, transaction, event, " +
    "appointment or text message) in WhatConverts.",
  idempotent: false,
  params: [
    {
      key: "profileId",
      label: "Profile ID",
      type: "number",
      hint: "Required for a Master Account Key connection. Not required — and ignored — " +
        "for a Profile Key connection, which already scopes to its own profile.",
    },
    {
      key: "sendNotification",
      label: "Send email notification",
      type: "boolean",
      default: false,
    },
    {
      key: "leadType",
      label: "Lead type",
      type: "select",
      required: true,
      options: LEAD_TYPES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "dateCreated",
      label: "Date created",
      type: "string",
      advanced: true,
      hint: "ISO 8601 date-time (UTC), e.g. 2015-11-10T00:00:00Z. Defaults to now.",
    },
    {
      key: "quotable",
      label: "Quotable",
      type: "select",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "pending", label: "Pending" },
        { value: "not_set", label: "Not set" },
      ],
      advanced: true,
    },
    { key: "quoteValue", label: "Quote value", type: "number", advanced: true },
    { key: "salesValue", label: "Sales value", type: "number", advanced: true },
    {
      key: "wcClientCurrent",
      label: "wc_client_current cookie value",
      type: "string",
      advanced: true,
      hint: "When set, WhatConverts overrides lead_source/medium/campaign/content/keyword, " +
        "gclid, msclkid, user_id and landing_url from this cookie.",
    },
    { key: "leadSource", label: "Lead source", type: "string", advanced: true },
    { key: "leadMedium", label: "Lead medium", type: "string", advanced: true },
    { key: "leadCampaign", label: "Lead campaign", type: "string", advanced: true },
    { key: "leadContent", label: "Lead content", type: "string", advanced: true },
    { key: "leadKeyword", label: "Lead keyword", type: "string", advanced: true },
    { key: "ipAddress", label: "IP address", type: "string", advanced: true },
    { key: "emailAddress", label: "Email address", type: "string", advanced: true },
    { key: "phoneNumber", label: "Phone number", type: "string", advanced: true },
    { key: "userId", label: "WhatConverts user ID", type: "string", advanced: true },
    { key: "gclid", label: "Google click identifier", type: "string", advanced: true },
    { key: "msclkid", label: "Microsoft click identifier", type: "string", advanced: true },
    { key: "fbclid", label: "Facebook click identifier", type: "string", advanced: true },
    { key: "fbpid", label: "Facebook browser identifier", type: "string", advanced: true },
    { key: "leadUrl", label: "Lead URL", type: "string", advanced: true },
    { key: "landingUrl", label: "Landing URL", type: "string", advanced: true },
    { key: "operatingSystem", label: "Operating system", type: "string", advanced: true },
    { key: "browser", label: "Browser", type: "string", advanced: true },
    { key: "deviceType", label: "Device type", type: "string", advanced: true },
    { key: "deviceMake", label: "Device make", type: "string", advanced: true },
    { key: "formName", label: "Form name", type: "string", advanced: true, hint: "web_form." },
    {
      key: "phoneName",
      label: "Tracking number name",
      type: "string",
      advanced: true,
      hint: "phone_call, text_message.",
    },
    {
      key: "trackingNumber",
      label: "Tracking number",
      type: "string",
      advanced: true,
      hint: "E.164 format. phone_call, text_message.",
    },
    {
      key: "destinationNumber",
      label: "Destination number",
      type: "string",
      advanced: true,
      hint: "E.164 format. phone_call.",
    },
    {
      key: "callerNumber",
      label: "Caller number",
      type: "string",
      advanced: true,
      hint: "E.164 format. phone_call, text_message.",
    },
    {
      key: "callerName",
      label: "Caller name",
      type: "string",
      advanced: true,
      hint: "phone_call.",
    },
    {
      key: "callDurationSeconds",
      label: "Call duration (seconds)",
      type: "number",
      advanced: true,
      hint: "phone_call.",
    },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "zip", label: "ZIP / postal code", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "country", label: "Country", type: "string", advanced: true },
    ...LEAD_TYPE_FIELDS,
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      advanced: true,
      hint: 'Object of field name to value, e.g. {"Company Name": "Acme"}.',
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint: 'Object of field name to value, e.g. {"Company Name": "Acme"}.',
    },
  ],
  output: LEAD_OUTPUT_FIELDS,

  async execute(input, ctx) {
    const body = compact({
      profile_id: input.profileId,
      send_notification: boolParam(input.sendNotification ?? false),
      lead_type: input.leadType,
      date_created: input.dateCreated,
      quotable: input.quotable,
      quote_value: input.quoteValue,
      sales_value: input.salesValue,
      wc_client_current: input.wcClientCurrent,
      lead_source: input.leadSource,
      lead_medium: input.leadMedium,
      lead_campaign: input.leadCampaign,
      lead_content: input.leadContent,
      lead_keyword: input.leadKeyword,
      ip_address: input.ipAddress,
      email_address: input.emailAddress,
      phone_number: input.phoneNumber,
      user_id: input.userId,
      gclid: input.gclid,
      msclkid: input.msclkid,
      fbclid: input.fbclid,
      fbpid: input.fbpid,
      lead_url: input.leadUrl,
      landing_url: input.landingUrl,
      operating_system: input.operatingSystem,
      browser: input.browser,
      device_type: input.deviceType,
      device_make: input.deviceMake,
      form_name: input.formName,
      phone_name: input.phoneName,
      tracking_number: input.trackingNumber,
      destination_number: input.destinationNumber,
      caller_number: input.callerNumber,
      caller_name: input.callerName,
      call_duration_seconds: input.callDurationSeconds,
      city: input.city,
      zip: input.zip,
      state: input.state,
      country: input.country,
      answer_status: input.answerStatus,
      line_type: input.lineType,
      call_transcription: input.callTranscription,
      voicemail_transcription: input.voicemailTranscription,
      message: input.message,
      event_category: input.eventCategory,
      event_action: input.eventAction,
      event_label: input.eventLabel,
      transaction_id: input.transactionId,
      transaction_tax: input.transactionTax,
      transaction_shipping: input.transactionShipping,
      sender_name: input.senderName,
      email_subject: input.emailSubject,
      email_message: input.emailMessage,
      additional_fields: asOptionalJson(input.additionalFields, "additionalFields"),
      custom_fields: asOptionalJson(input.customFields, "customFields"),
    });

    return await new WhatConvertsClient(ctx).post("/leads", body);
  },
};

export default leadCreate;
