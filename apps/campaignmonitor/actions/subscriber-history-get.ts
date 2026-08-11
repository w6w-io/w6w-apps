import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { emailParam, listIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/subscribers/{listid}/history.json?email={email}` — everything a
 * subscriber has received and done. **List-level.**
 *
 * One entry per campaign or automated-workflow email, each with an `Actions`
 * array of `{Event, Date, IPAddress, Detail}`. `Detail` carries the clicked URL
 * for a `Click` event and is empty otherwise.
 *
 * **The history is capped at 60 opens/clicks per campaign** — the vendor says so
 * explicitly. A subscriber who opened a campaign a hundred times shows sixty
 * events, so this is a record of activity, not a count of it; use
 * `campaign-summary-get` for totals.
 *
 * Note the response includes `IPAddress` for every event, which is personal
 * data in most jurisdictions.
 */
interface Input {
  listId: string;
  email: string;
}

interface HistoryEntry {
  ID: string;
  Type: string;
  Name: string;
  Actions: Array<{ Event: string; Date: string; IPAddress: string; Detail: string }>;
}

const subscriberHistoryGet: ActionDefinition<Input, HistoryEntry[]> = {
  key: "subscriber-history-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber History",
  description:
    "Read a subscriber's campaign and automated-email history with every recorded open, click " +
    "and bounce. Capped at 60 opens/clicks per campaign, and each event carries an IP address.",
  params: [listIdParam, emailParam],
  output: [
    { key: "ID", type: "string", label: "Campaign or journey-email ID" },
    { key: "Type", type: "string", label: "Campaign or Journey" },
    { key: "Name", type: "string", label: "Campaign name" },
    { key: "Actions", type: "array", label: "Event, date, IP address and detail per action" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<HistoryEntry[]>(
      `/subscribers/${encodeId(input.listId)}/history`,
      { query: { email: input.email } },
    );
  },
};

export default subscriberHistoryGet;
