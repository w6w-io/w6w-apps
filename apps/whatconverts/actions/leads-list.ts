import type { ActionDefinition } from "@w6w/types";
import { boolParam, WhatConvertsClient } from "../lib/client.ts";
import { LEAD_TYPES } from "../lib/lead-fields.ts";

interface Input {
  leadsPerPage?: number;
  pageNumber?: number;
  accountId?: number;
  profileId?: number;
  leadType?: string;
  leadStatus?: "repeat" | "unique";
  startDate?: string;
  endDate?: string;
  order?: "asc" | "desc";
  quotable?: "yes" | "no" | "pending" | "not_set";
  quoteValue?: "has_value" | "no_value";
  salesValue?: "has_value" | "no_value";
  phoneNumber?: string;
  emailAddress?: string;
  userId?: string;
  spam?: boolean;
  duplicate?: boolean;
  leadSource?: string;
  leadMedium?: string;
  leadCampaign?: string;
  leadContent?: string;
  leadKeyword?: string;
  customerJourney?: boolean;
}

/**
 * `GET /leads` — a paginated list of every call, form, chat, email, appointment,
 * transaction, text message or "event" WhatConverts has tracked.
 *
 * Verified against `whatconverts.com/api/leads/` on 2026-08-29. `leads_per_page` defaults
 * to 25 and caps at 2500 — this action prefills 25 and says so, since a workflow calling
 * this on a schedule should not silently pull the vendor's maximum on every run.
 *
 * `account_id`/`profile_id` filters, and returning leads across more than one profile at
 * all, are only honoured with a Master Account (agency) Key — a Profile Key already scopes
 * every call to its one profile and ignores these two.
 *
 * `customer_journey: true` is Elite-plan only; requesting it on a lower plan is not
 * documented to error, so this app passes it through as asked rather than guessing.
 */
const leadsList: ActionDefinition<Input> = {
  key: "leads-list",
  type: "read",
  resource: "lead",
  title: "List Leads",
  description: "Get a paginated list of leads — calls, forms, chats, emails, transactions, " +
    "events, appointments and text messages.",
  params: [
    {
      key: "leadsPerPage",
      label: "Leads per page",
      type: "number",
      default: 25,
      hint: "Vendor default 25, maximum 2500.",
    },
    { key: "pageNumber", label: "Page number", type: "number" },
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      advanced: true,
      hint: "Master Account Key only.",
    },
    {
      key: "profileId",
      label: "Profile ID",
      type: "number",
      advanced: true,
      hint: "Master Account Key only.",
    },
    {
      key: "leadType",
      label: "Lead type",
      type: "select",
      options: LEAD_TYPES.map((v) => ({ value: v, label: v })),
      advanced: true,
    },
    {
      key: "leadStatus",
      label: "Lead status",
      type: "select",
      options: [{ value: "repeat", label: "Repeat" }, { value: "unique", label: "Unique" }],
      advanced: true,
    },
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      advanced: true,
      hint: "ISO 8601 date or date-time (UTC), e.g. 2015-11-10. Range can span up to 400 days.",
    },
    { key: "endDate", label: "End date", type: "string", advanced: true },
    {
      key: "order",
      label: "Order by date created",
      type: "select",
      options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
      default: "desc",
      advanced: true,
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
    {
      key: "quoteValue",
      label: "Has quote value",
      type: "select",
      options: [{ value: "has_value", label: "Has value" }, {
        value: "no_value",
        label: "No value",
      }],
      advanced: true,
    },
    {
      key: "salesValue",
      label: "Has sales value",
      type: "select",
      options: [{ value: "has_value", label: "Has value" }, {
        value: "no_value",
        label: "No value",
      }],
      advanced: true,
    },
    {
      key: "phoneNumber",
      label: "Contact phone number",
      type: "string",
      advanced: true,
      hint: "E.164 formatted.",
    },
    { key: "emailAddress", label: "Contact email address", type: "string", advanced: true },
    { key: "userId", label: "WhatConverts user ID", type: "string", advanced: true },
    { key: "spam", label: "Spam leads only", type: "boolean", advanced: true },
    { key: "duplicate", label: "Duplicate leads only", type: "boolean", advanced: true },
    { key: "leadSource", label: "Lead source", type: "string", advanced: true },
    { key: "leadMedium", label: "Lead medium", type: "string", advanced: true },
    { key: "leadCampaign", label: "Lead campaign", type: "string", advanced: true },
    { key: "leadContent", label: "Lead content", type: "string", advanced: true },
    { key: "leadKeyword", label: "Lead keyword", type: "string", advanced: true },
    {
      key: "customerJourney",
      label: "Include customer journey",
      type: "boolean",
      advanced: true,
      hint: "Elite plans only.",
    },
  ],
  output: [
    { key: "page_number", type: "number", label: "Current page number" },
    { key: "leads_per_page", type: "number", label: "Leads returned in this request" },
    { key: "total_pages", type: "number", label: "Total pages available" },
    { key: "total_leads", type: "number", label: "Total leads available" },
    { key: "leads", type: "array", label: "Leads" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get("/leads", {
      leads_per_page: input.leadsPerPage ?? 25,
      page_number: input.pageNumber,
      account_id: input.accountId,
      profile_id: input.profileId,
      lead_type: input.leadType,
      lead_status: input.leadStatus,
      start_date: input.startDate,
      end_date: input.endDate,
      order: input.order,
      quotable: input.quotable,
      quote_value: input.quoteValue,
      sales_value: input.salesValue,
      phone_number: input.phoneNumber,
      email_address: input.emailAddress,
      user_id: input.userId,
      spam: boolParam(input.spam),
      duplicate: boolParam(input.duplicate),
      lead_source: input.leadSource,
      lead_medium: input.leadMedium,
      lead_campaign: input.leadCampaign,
      lead_content: input.leadContent,
      lead_keyword: input.leadKeyword,
      customer_journey: boolParam(input.customerJourney),
    });
  },
};

export default leadsList;
