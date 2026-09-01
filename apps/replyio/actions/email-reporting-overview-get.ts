import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, ReplyClient } from "../lib/client.ts";

/**
 * `POST /v3/reporting/emails/overview` — the headline email numbers for a
 * period as one team-wide total: how many contacts were reached, delivered
 * to, opened, replied, showed interest, bounced, auto-replied, were out of
 * office, opted out, or booked a meeting — each as a distinct-contact count
 * paired with its rate. Requires `reporting:read`.
 *
 * `POST`, not `GET`, because the filter object is too rich for a query string
 * — but this action performs no writes, so it is typed `read` here.
 *
 * Reply's own "Rate limits" page singles out `/v3/reporting/*` as having a
 * lower, undocumented hourly ceiling than the general 100/min · 3,000/hour —
 * calling this action on a tight loop is the fastest way to a 429 in this app.
 */
interface Input {
  from?: string;
  to?: string;
  dateRangePreset?: string;
  sequenceIds?: unknown;
  emailAccountIds?: unknown;
}

interface Output {
  contacted: number;
  delivered: number;
  opened: number;
  replied: number;
  interested: number;
  bounced: number;
  meetingsBooked: number;
  deliveredPercentage: number;
  openedPercentage: number;
  repliedPercentage: number;
  meetingsBookedPercentage: number;
}

const emailReportingOverviewGet: ActionDefinition<Input, Output> = {
  key: "email-reporting-overview-get",
  type: "read",
  resource: "report",
  title: "Get Email Reporting Overview",
  description: "Team-wide email delivery and engagement totals for a period: contacted, " +
    "delivered, opened, replied, interested, bounced, and meetings booked — each with its rate.",
  params: [
    {
      key: "dateRangePreset",
      label: "Date range",
      type: "select",
      options: [
        { value: "lastWeek", label: "Last week" },
        { value: "lastMonth", label: "Last month" },
        { value: "lastYear", label: "Last year" },
        { value: "allTime", label: "All time" },
      ],
      hint: "Use this OR the explicit From/To dates below, not both.",
    },
    {
      key: "from",
      label: "From (ISO date)",
      type: "string",
      hint: "e.g. 2026-08-01. Ignored when a date range preset is set.",
    },
    { key: "to", label: "To (ISO date)", type: "string" },
    {
      key: "sequenceIds",
      label: "Sequence IDs",
      type: "json",
      hint: "Array of sequence ids to scope the report to. Leave empty for every sequence.",
    },
    {
      key: "emailAccountIds",
      label: "Email account IDs",
      type: "json",
      hint: "Array of email account ids to scope the report to.",
    },
  ],
  output: [
    { key: "contacted", type: "number", label: "Distinct contacts reached" },
    { key: "delivered", type: "number", label: "Delivered" },
    { key: "opened", type: "number", label: "Opened" },
    { key: "replied", type: "number", label: "Replied" },
    { key: "interested", type: "number", label: "Interested" },
    { key: "bounced", type: "number", label: "Bounced" },
    { key: "meetingsBooked", type: "number", label: "Meetings booked" },
    { key: "deliveredPercentage", type: "number", label: "Delivered rate" },
    { key: "openedPercentage", type: "number", label: "Open rate" },
    { key: "repliedPercentage", type: "number", label: "Reply rate" },
    { key: "meetingsBookedPercentage", type: "number", label: "Meetings-booked rate" },
  ],

  execute(input, ctx) {
    const filters = compact({
      from: input.from,
      to: input.to,
      dateRangePreset: input.dateRangePreset,
      sequenceIds: asOptionalJson(input.sequenceIds, "Sequence IDs"),
      emailAccountIds: asOptionalJson(input.emailAccountIds, "Email account IDs"),
    });
    return new ReplyClient(ctx).json<Output>("/reporting/emails/overview", {
      method: "POST",
      body: { filters },
    });
  },
};

export default emailReportingOverviewGet;
