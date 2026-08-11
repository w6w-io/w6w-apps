import type { ActionDefinition } from "@w6w/types";
import { ApifyClient } from "../lib/client.ts";

/**
 * `GET /v2/users/me/usage/monthly` — what this account spent, and on what.
 *
 * Returns the current usage cycle's totals plus a **daily breakdown**
 * (`dailyServiceUsages`), which is the part the Limits endpoint cannot give
 * you: it answers "which day did the bill jump" rather than just "how much so
 * far".
 *
 * ## The date parameter selects a cycle, not a day
 *
 * `date` is `YYYY-MM-DD`, and Apify returns "the monthly usage cycle that
 * includes that date" — the whole cycle, not that day's figures. A cycle is not
 * a calendar month either; it starts on the account's own billing anniversary,
 * which is why `usageCycle.startAt`/`endAt` come back with the answer.
 *
 * Two totals are reported, before and after volume discount. Bill against the
 * second.
 */
interface Input {
  date?: string;
}

const accountUsageGet: ActionDefinition<Input> = {
  key: "account-usage-get",
  type: "read",
  resource: "account",
  title: "Get Monthly Usage",
  description:
    "Read the account's usage for a monthly cycle, including the daily breakdown and totals.",
  params: [
    {
      key: "date",
      label: "Date within the cycle",
      type: "date",
      hint:
        "YYYY-MM-DD. Returns the whole billing cycle containing this date, not this day. Leave " +
        "empty for the current cycle.",
    },
  ],
  output: [
    { key: "usageCycle", type: "object", label: "Start and end of the cycle returned" },
    { key: "monthlyServiceUsage", type: "object", label: "Totals per service" },
    { key: "dailyServiceUsages", type: "array", label: "Per-day breakdown" },
    {
      key: "totalUsageCreditsUsdAfterVolumeDiscount",
      type: "number",
      label: "Total charged, after volume discount",
    },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data("/users/me/usage/monthly", {
      query: { date: input.date },
    });
  },
};

export default accountUsageGet;
