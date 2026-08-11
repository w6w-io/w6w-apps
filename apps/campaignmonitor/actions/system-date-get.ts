import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";

/**
 * `GET /api/v3.3/systemdate.json` — the current time **in the account's own
 * timezone**. **Account-level.**
 *
 * The vendor's reason for publishing this is the reason to use it: "This is
 * useful when, for example, you are syncing your Campaign Monitor lists with an
 * external list, allowing you to accurately determine the time on our server
 * when you carry out the synchronization." Every date filter in this API — the
 * `date` parameter on the subscriber-state lists, `SendDate` on a campaign send,
 * the list stats' "today"/"this week" buckets — is interpreted in the client's
 * timezone, so a workflow that computes a cutoff from its own clock will drift.
 *
 * The response is one string, `{"SystemDate": "2010-11-16 14:18:00"}`, with no
 * timezone offset attached. It is also the liveness probe both auth methods use,
 * precisely because it is this small — see `auth/api-key.ts`.
 */
interface SystemDate {
  SystemDate?: string;
}

const systemDateGet: ActionDefinition<Record<string, never>, SystemDate> = {
  key: "system-date-get",
  type: "read",
  resource: "account",
  title: "Get Current Date",
  description:
    "Read the current date and time in the account's timezone (format YYYY-MM-DD HH:MM:SS, no " +
    "offset). Use it to compute date filters, which this API always interprets in the client's " +
    "timezone rather than UTC.",
  params: [],
  output: [{ key: "SystemDate", type: "string", label: "Server time in the account's timezone" }],

  execute(_input, ctx) {
    return new CampaignMonitorClient(ctx).json<SystemDate>("/systemdate");
  },
};

export default systemDateGet;
