import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient, toList } from "../lib/client.ts";

/**
 * `GET /api/v2/accounts/analytics/daily` — campaign emails sent per day per
 * sending account. Defaults to a trailing 30-day window ending today; the
 * vendor caps the range at 31 days regardless of the dates given, and
 * `emails` accepts at most 200 accounts.
 */
interface Input {
  start_date?: string;
  end_date?: string;
  emails?: string[] | string;
}

const accountDailyAnalyticsGet: ActionDefinition<Input> = {
  key: "account-daily-analytics-get",
  type: "read",
  resource: "account",
  title: "Get Daily Account Analytics",
  description: "Emails sent per day, per sending account. Defaults to the trailing 30 days.",
  params: [
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      placeholder: "2026-01-01",
      hint: "Defaults to 30 days before End date. The maximum range is 31 days.",
    },
    { key: "end_date", label: "End date", type: "string", hint: "Defaults to today." },
    {
      key: "emails",
      label: "Accounts",
      type: "array",
      item: { type: "string", placeholder: "jondoe@example.com" },
      hint: "Up to 200 accounts. Leave empty for every account in the workspace.",
    },
  ],
  output: [
    { key: "date", type: "string", label: "Date" },
    { key: "email_account", type: "string", label: "Sending account" },
    { key: "sent", type: "number", label: "Emails sent" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json("/accounts/analytics/daily", {
      query: {
        start_date: input.start_date,
        end_date: input.end_date,
        emails: toList(input.emails),
      },
    });
  },
};

export default accountDailyAnalyticsGet;
