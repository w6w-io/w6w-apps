import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/transactional/statistics` — delivery and engagement totals for
 * transactional mail.
 *
 * ## `Sent` is not `Delivered`, and the vendor says so
 *
 * "**Sent** is the number of emails that were successfully sent from our
 * platform. **Delivered** is the number of emails that were successfully
 * received by the recipient's email provider." A dashboard that reports `Sent`
 * as delivery overstates it by exactly the bounce count.
 *
 * ## Group and smart email are mutually exclusive
 *
 * Supplying both is code 924, "You may only supply one of Group or Smart Email
 * ID", so this action refuses the combination before spending a request.
 *
 * `from` and `to` are `YYYY-MM-DD` and default to the last 29 days through
 * today. `timezone` is `utc` or `client` (code 923 otherwise) and defaults to the
 * client's own timezone — which, as everywhere else in this API, is not your
 * workflow's clock.
 */
interface Input {
  clientId?: string;
  group?: string;
  smartEmailId?: string;
  from?: string;
  to?: string;
  timezone?: string;
}

interface TransactionalStatistics {
  Query?: Record<string, unknown>;
  Sent: number;
  Bounces: number;
  Delivered: number;
  Opened: number;
  Clicked: number;
}

const transactionalStatisticsGet: ActionDefinition<Input, TransactionalStatistics> = {
  key: "transactional-statistics-get",
  type: "read",
  resource: "transactional",
  title: "Get Transactional Statistics",
  description:
    "Read transactional sent / bounced / delivered / opened / clicked totals for a date range, " +
    "optionally narrowed to one classic group or one smart email.",
  params: [
    {
      key: "clientId",
      label: "Client",
      type: "string",
      hint:
        "REQUIRED if your connection uses an account-wide key or OAuth; leave empty if it uses a " +
        "client-specific key.",
    },
    {
      key: "group",
      label: "Classic group",
      type: "string",
      hint: "Narrow to one classic reporting group. Cannot be combined with a smart email ID.",
    },
    {
      key: "smartEmailId",
      label: "Smart email",
      type: "string",
      hint:
        "Narrow to one smart email (a GUID; code 925 if it is not). Cannot be combined with a " +
        "group.",
    },
    {
      key: "from",
      label: "From date",
      type: "string",
      placeholder: "2026-01-01",
      hint: "YYYY-MM-DD. Defaults to 29 days ago. Must not be after the To date (code 921).",
    },
    {
      key: "to",
      label: "To date",
      type: "string",
      placeholder: "2026-01-31",
      hint: "YYYY-MM-DD. Defaults to today.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "select",
      options: [
        { value: "client", label: "Client's timezone (the API default)" },
        { value: "utc", label: "UTC" },
      ],
      hint: "Only these two values are accepted (code 923).",
    },
  ],
  output: [
    { key: "Sent", type: "number", label: "Sent from the platform" },
    { key: "Delivered", type: "number", label: "Accepted by the recipient's provider" },
    { key: "Bounces", type: "number", label: "Bounces" },
    { key: "Opened", type: "number", label: "Opened" },
    { key: "Clicked", type: "number", label: "Clicked" },
    { key: "Query", type: "object", label: "Echo of the filters that were applied" },
  ],

  execute(input, ctx) {
    if (input.group && input.smartEmailId) {
      throw new Error(
        "Supply a classic group or a smart email ID, not both (the API answers code 924).",
      );
    }
    return new CampaignMonitorClient(ctx).transactional<TransactionalStatistics>("/statistics", {
      query: {
        clientID: input.clientId,
        group: input.group,
        smartEmailID: input.smartEmailId,
        from: input.from,
        to: input.to,
        timezone: input.timezone,
      },
    });
  },
};

export default transactionalStatisticsGet;
