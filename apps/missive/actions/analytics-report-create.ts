import type { ActionDefinition } from "@w6w/types";
import { compact, MissiveClient, toIdList } from "../lib/client.ts";

interface Input {
  organization: string;
  start: number;
  end: number;
  timeZone?: string;
  teams?: string;
  users?: string;
  accounts?: string;
  accountTypes?: string;
  sharedLabels?: string;
}

/**
 * `POST /v1/analytics/reports` — verified against
 * `missiveapp.com/docs/developers/rest-api/endpoints` §Analytics, 2026-08-29.
 *
 * Two-step by design: this kicks off report generation and returns only an
 * `id`; `analytics-report-get` polls for the actual data. Missive's own
 * guidance is to fetch 5 seconds after creation and retry every 5 seconds —
 * most reports finish in 2-3 seconds, some take 30+, and a completed report
 * expires 60 seconds after completion.
 *
 * Requires a Productive or Business plan; the optional filters (teams, users,
 * labels, accounts) additionally require Business.
 */
const action: ActionDefinition<Input> = {
  key: "analytics-report-create",
  type: "perform",
  resource: "analytics",
  title: "Create Analytics Report",
  description:
    "Start generating an analytics report for a period. Poll Get Analytics Report with the " +
    "returned ID to fetch the data — reports usually finish within a few seconds and expire " +
    "60 seconds after completion. Requires a Productive or Business plan; filters require " +
    "Business.",
  idempotent: false,
  params: [
    { key: "organization", label: "Organization ID", type: "string", required: true },
    {
      key: "start",
      label: "Period Start (Unix timestamp)",
      type: "number",
      required: true,
    },
    { key: "end", label: "Period End (Unix timestamp)", type: "number", required: true },
    {
      key: "timeZone",
      label: "Time Zone",
      type: "string",
      default: "",
      placeholder: "America/Montreal",
      hint: "IANA time zone identifier.",
    },
    {
      key: "teams",
      label: "Teams (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Business plan required.",
    },
    {
      key: "users",
      label: "Users (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Business plan required.",
    },
    {
      key: "accounts",
      label: "Accounts (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Business plan required.",
    },
    {
      key: "accountTypes",
      label: "Account Types (comma-separated)",
      type: "string",
      default: "",
      advanced: true,
      hint: "custom, email, instagram, live_chat, messenger, sms, whatsapp.",
    },
    {
      key: "sharedLabels",
      label: "Shared Labels (comma-separated IDs)",
      type: "string",
      default: "",
      advanced: true,
      hint: "Business plan required.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Report ID — pass to Get Analytics Report" },
  ],

  async execute(input, ctx) {
    if (!input.organization) throw new Error("`organization` is required");
    if (!input.start || !input.end) throw new Error("`start` and `end` are required");

    const body = {
      reports: compact({
        organization: input.organization,
        start: input.start,
        end: input.end,
        time_zone: input.timeZone,
        teams: toIdList(input.teams).length ? toIdList(input.teams) : undefined,
        users: toIdList(input.users).length ? toIdList(input.users) : undefined,
        accounts: toIdList(input.accounts).length ? toIdList(input.accounts) : undefined,
        account_types: toIdList(input.accountTypes).length
          ? toIdList(input.accountTypes)
          : undefined,
        shared_labels: toIdList(input.sharedLabels).length
          ? toIdList(input.sharedLabels)
          : undefined,
      }),
    };

    ctx.log("info", "creating Missive analytics report", { organization: input.organization });
    const res = await new MissiveClient(ctx).json<{ reports: { id: string } }>(
      "/analytics/reports",
      { method: "POST", body },
    );
    return res.reports;
  },
};

export default action;
