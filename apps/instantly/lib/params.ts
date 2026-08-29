import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Instantly actions.
 *
 * Every enum here is copied from Instantly's OpenAPI 3.0 document (fetched
 * 2026-08-29 from `api.instantly.ai/openapi/api_v2.json`), not inferred. Three
 * numeric enums look alike and are NOT interchangeable — mixing them up is the
 * single easiest way to silently misreport a status:
 *
 *  - **Campaign status** (`status` on Campaign / `campaign_status` on the
 *    analytics endpoints): `-99, -1, -2, 0, 1, 2, 3, 4`.
 *  - **Account status** (`status` on Account / the `listAccount` filter):
 *    `1, 2, 3, -1, -2, -3`, but `2` means "Paused" and `3` means "Temporarily
 *    paused for maintenance".
 *  - **Lead status** (the `status` filter on `bulkDeleteLeads` only — the
 *    `Lead` entity itself does not expose this numeric code): also
 *    `1, 2, 3, -1, -2, -3`, but here `3` means "Completed" and `-1` means
 *    "Bounced". Same six numbers as Account status, different meanings.
 */

/** `Campaign.status` / `campaign_status`. Draft, active, paused, and the four auto-pause reasons. */
export const campaignStatusOptions = [
  { value: 0, label: "Draft" },
  { value: 1, label: "Active" },
  { value: 2, label: "Paused" },
  { value: 3, label: "Completed" },
  { value: 4, label: "Running Subsequences" },
  { value: -99, label: "Account Suspended" },
  { value: -1, label: "Accounts Unhealthy" },
  { value: -2, label: "Bounce Protect" },
];

/** `Account.status` / the `listAccount` `status` filter. */
export const accountStatusOptions = [
  { value: 1, label: "Active" },
  { value: 2, label: "Paused" },
  { value: 3, label: "Temporarily paused for maintenance (auto-resumes)" },
  { value: -1, label: "Connection Error" },
  { value: -2, label: "Soft Bounce Error" },
  { value: -3, label: "Sending Error" },
];

/** The `status` filter on `bulkDeleteLeads`. Same numbers as account status, different meanings. */
export const leadDeleteStatusOptions = [
  { value: 1, label: "Active" },
  { value: 2, label: "Paused" },
  { value: 3, label: "Completed" },
  { value: -1, label: "Bounced" },
  { value: -2, label: "Unsubscribed" },
  { value: -3, label: "Skipped" },
];

/** `Account.provider_code` / the `listAccount` `provider_code` filter. */
export const providerCodeOptions = [
  { value: 1, label: "Custom IMAP/SMTP" },
  { value: 2, label: "Google" },
  { value: 3, label: "Microsoft" },
  { value: 4, label: "AWS" },
  { value: 8, label: "AirMail" },
  { value: 11, label: "Airmail Instant" },
];

/** `Lead.lt_interest_status`, used by create/patch/bulk-add and by `updateLeadInterestStatus`. */
export const leadInterestStatusOptions = [
  { value: 1, label: "Interested" },
  { value: 2, label: "Meeting Booked" },
  { value: 3, label: "Meeting Completed" },
  { value: 4, label: "Won" },
  { value: 0, label: "Out of Office" },
  { value: -1, label: "Not Interested" },
  { value: -2, label: "Wrong Person" },
  { value: -3, label: "Lost" },
  { value: -4, label: "No Show" },
];

/** The `filter` field shared by `listLeads` and `moveLeads`. */
export const leadFilterOptions = [
  { value: "FILTER_VAL_CONTACTED", label: "Contacted" },
  { value: "FILTER_VAL_NOT_CONTACTED", label: "Not contacted" },
  { value: "FILTER_VAL_COMPLETED", label: "Completed" },
  { value: "FILTER_VAL_UNSUBSCRIBED", label: "Unsubscribed" },
  { value: "FILTER_VAL_ACTIVE", label: "Active" },
  { value: "FILTER_LEAD_INTERESTED", label: "Interested" },
  { value: "FILTER_LEAD_NOT_INTERESTED", label: "Not interested" },
  { value: "FILTER_LEAD_MEETING_BOOKED", label: "Meeting booked" },
  { value: "FILTER_LEAD_MEETING_COMPLETED", label: "Meeting completed" },
  { value: "FILTER_LEAD_CLOSED", label: "Closed" },
  { value: "FILTER_LEAD_OUT_OF_OFFICE", label: "Out of office" },
  { value: "FILTER_LEAD_WRONG_PERSON", label: "Wrong person" },
  { value: "FILTER_LEAD_LOST", label: "Lost" },
  { value: "FILTER_LEAD_NO_SHOW", label: "No show" },
  { value: "FILTER_LEAD_CUSTOM_LABEL_POSITIVE", label: "Custom label: positive" },
  { value: "FILTER_LEAD_CUSTOM_LABEL_NEGATIVE", label: "Custom label: negative" },
  { value: "FILTER_VAL_BOUNCED", label: "Bounced" },
  { value: "FILTER_VAL_SKIPPED", label: "Skipped" },
  { value: "FILTER_VAL_RISKY", label: "Risky (verification)" },
  { value: "FILTER_VAL_INVALID", label: "Invalid (verification)" },
  { value: "FILTER_VAL_VALID", label: "Valid (verification)" },
  { value: "FILTER_VAL_IN_SUBSEQUENCE", label: "In subsequence" },
  { value: "FILTER_VAL_OPENED_NO_REPLY", label: "Opened, no reply" },
  { value: "FILTER_VAL_COMPLETED_NO_REPLY", label: "Completed sequence, no reply" },
  { value: "FILTER_VAL_NO_OPENS", label: "No opens" },
  { value: "FILTER_VAL_REPLIED", label: "Replied" },
  { value: "FILTER_VAL_LINK_CLICKED", label: "Clicked a link" },
];

/**
 * `limit` + `starting_after` — the cursor pair every list endpoint in this app
 * uses. There is no `total` and no offset: page by feeding one response's
 * `next_starting_after` into the next call's `starting_after`.
 */
export function paginationParams(defaultLimit: number): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Number of items to return. Instantly's own ceiling is 100.",
    },
    {
      key: "starting_after",
      label: "Starting after (cursor)",
      type: "string",
      hint: "Opaque pagination cursor. Paste the `next_starting_after` value from the previous " +
        "response to fetch the next page; leave empty for the first page.",
    },
  ];
}

export const campaignIdParam: Param = {
  key: "id",
  label: "Campaign",
  type: "string",
  required: true,
  placeholder: "01a048d3-e988-7992-8201-79cf675a613c",
  hint: "Campaign ID, from a List Campaigns or Create Campaign result.",
};

export const leadIdParam: Param = {
  key: "id",
  label: "Lead",
  type: "string",
  required: true,
  placeholder: "01a048d3-eab6-7eb2-ba2a-3ae239bd4ef1",
  hint: "Lead ID, from a List Leads or Create Lead result.",
};

export const listIdParam: Param = {
  key: "list_id",
  label: "Lead list",
  type: "string",
  hint: "Lead list ID. Use this OR a campaign, not both.",
};

/**
 * The lead-profile fields shared by `lead-create` and `lead-patch`.
 * `custom_variables` (used for merge-field personalization) applies workspace
 * wide once set on any lead in a campaign, per the vendor's own note.
 */
export function leadProfileParams(): Param[] {
  return [
    { key: "personalization", label: "Personalization", type: "text" },
    { key: "website", label: "Website", type: "string" },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    { key: "company_name", label: "Company name", type: "string" },
    { key: "job_title", label: "Job title", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "lt_interest_status",
      label: "Interest status",
      type: "select",
      options: leadInterestStatusOptions,
    },
    { key: "pl_value_lead", label: "Potential value", type: "string" },
    { key: "assigned_to", label: "Assigned to (user ID)", type: "string" },
    {
      key: "custom_variables",
      label: "Custom variables (JSON)",
      type: "json",
      hint: '{"key": "value", ...} — merge fields for personalization. Setting these on a lead ' +
        "updates the whole campaign to allow the same variables on every other lead in it.",
    },
  ];
}

export interface LeadProfileInput {
  personalization?: string;
  website?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  job_title?: string;
  phone?: string;
  lt_interest_status?: number;
  pl_value_lead?: string;
  assigned_to?: string;
  custom_variables?: unknown;
}

/**
 * The scalar sending-behaviour overrides shared by `campaign-create` and
 * `campaign-patch`. The vendor's `campaign_schedule` and `sequences` objects
 * are deliberately NOT expanded field-by-field here — `campaign_schedule`
 * carries a ~420-entry IANA timezone enum plus a nested per-weekday schedule
 * shape, and `sequences` carries the actual email copy (steps, delay,
 * variants) — building either as individual form fields would dwarf every
 * other field in this app for a shape a caller almost always assembles
 * programmatically anyway. Both are exposed as raw `json`, mirroring how
 * `apps/apify`'s `actor-run` exposes the vendor's own free-form Actor input.
 */
export function campaignSendingParams(): Param[] {
  return [
    {
      key: "pl_value",
      label: "Positive-lead value",
      type: "number",
      hint: "Value credited per positive lead, for reporting.",
    },
    { key: "is_evergreen", label: "Evergreen", type: "boolean" },
    {
      key: "email_list",
      label: "Sending accounts",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
      hint: "Email addresses of the connected sending accounts this campaign sends from.",
    },
    { key: "daily_limit", label: "Daily send limit", type: "number" },
    {
      key: "daily_max_leads",
      label: "Daily max new leads contacted",
      type: "number",
      validation: { integer: true, min: 0 },
    },
    { key: "email_gap", label: "Minutes between emails", type: "number" },
    { key: "random_wait_max", label: "Max random wait (minutes)", type: "number" },
    { key: "stop_on_reply", label: "Stop sequence on reply", type: "boolean" },
    {
      key: "stop_for_company",
      label: "Stop for whole company (domain) on reply",
      type: "boolean",
    },
    { key: "text_only", label: "Text-only emails", type: "boolean" },
    { key: "link_tracking", label: "Track link clicks", type: "boolean" },
    { key: "open_tracking", label: "Track opens", type: "boolean" },
    { key: "match_lead_esp", label: "Match sending account to lead's ESP", type: "boolean" },
    { key: "insert_unsubscribe_header", label: "Insert unsubscribe header", type: "boolean" },
    { key: "allow_risky_contacts", label: "Allow risky contacts", type: "boolean" },
    { key: "disable_bounce_protect", label: "Disable bounce protection", type: "boolean" },
    {
      key: "email_tag_list",
      label: "Tag IDs",
      type: "array",
      item: { type: "string" },
    },
    {
      key: "cc_list",
      label: "CC",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
    },
    {
      key: "bcc_list",
      label: "BCC",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
    },
    {
      key: "campaign_schedule",
      label: "Campaign schedule (JSON)",
      type: "json",
      hint: "{ start_date?, end_date?, schedules: [{ name, timing: { from, to }, days: " +
        '{"0"..."6": boolean}, timezone }] } — see the Instantly API reference for the full ' +
        "schedule shape and the IANA timezone enum.",
    },
    {
      key: "sequences",
      label: "Sequences (JSON)",
      type: "json",
      hint: 'The email copy: [{ steps: [{ type: "email", delay, variants: [{ subject, body }] ' +
        "}] }]. Even though this is an array, Instantly only reads the FIRST element — put every " +
        "step in one sequence.",
    },
  ];
}

export interface CampaignSendingInput {
  pl_value?: number;
  is_evergreen?: boolean;
  email_list?: string[];
  daily_limit?: number;
  daily_max_leads?: number;
  email_gap?: number;
  random_wait_max?: number;
  stop_on_reply?: boolean;
  stop_for_company?: boolean;
  text_only?: boolean;
  link_tracking?: boolean;
  open_tracking?: boolean;
  match_lead_esp?: boolean;
  insert_unsubscribe_header?: boolean;
  allow_risky_contacts?: boolean;
  disable_bounce_protect?: boolean;
  email_tag_list?: string[];
  cc_list?: string[];
  bcc_list?: string[];
  campaign_schedule?: unknown;
  sequences?: unknown;
}

/** The `{email}` path parameter every Account action addresses a sending account by. */
export const accountEmailParam: Param = {
  key: "email",
  label: "Sending account email",
  type: "string",
  required: true,
  placeholder: "jondoe@example.com",
  hint: "The email address of the connected sending account — Instantly addresses accounts by " +
    "email, not by a separate ID.",
};
