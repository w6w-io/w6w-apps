import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/campaigns/{campaignid}/summary.json` — headline results for a
 * sent campaign. **Campaign-level.**
 *
 * ## `TotalOpened` and `UniqueOpened` are both there, and they are not the same
 *
 * `TotalOpened` counts every open event; `UniqueOpened` counts people. Reporting
 * an open rate from `TotalOpened / Recipients` overstates it — in the vendor's
 * own example, 345 opens from 298 people. `Clicks` has no unique counterpart in
 * this response; use `campaign-interactions-get` with the `clicks` event for the
 * per-subscriber detail.
 *
 * `Name` was added to this response in v3.3, so code written against 3.2 that
 * looked up the campaign name separately no longer needs to.
 *
 * The three URLs it returns — `WebVersionURL`, `WebVersionTextURL` and
 * `WorldviewURL` — are public links on `createsend.com` and on the client's own
 * `*.createsend.com` subdomain. They are returned as data and never fetched by
 * this app, which is why neither host is in `w6w.network.allow`.
 */
interface Input {
  campaignId: string;
}

interface CampaignSummary {
  Name?: string;
  Recipients: number;
  TotalOpened: number;
  UniqueOpened: number;
  Clicks: number;
  Unsubscribed: number;
  Bounced: number;
  SpamComplaints: number;
  Forwards?: number;
  Likes?: number;
  Mentions?: number;
  WebVersionURL?: string;
  WebVersionTextURL?: string;
  WorldviewURL?: string;
}

const campaignSummaryGet: ActionDefinition<Input, CampaignSummary> = {
  key: "campaign-summary-get",
  type: "read",
  resource: "campaign",
  title: "Get Campaign Summary",
  description:
    "Read a sent campaign's totals: recipients, opens (total and unique), clicks, unsubscribes, " +
    "bounces and spam complaints, plus its public web-version and Worldview URLs.",
  params: [campaignIdParam],
  output: [
    { key: "Name", type: "string", label: "Campaign name (added in v3.3)" },
    { key: "Recipients", type: "number", label: "Recipients" },
    { key: "TotalOpened", type: "number", label: "Open events" },
    { key: "UniqueOpened", type: "number", label: "People who opened" },
    { key: "Clicks", type: "number", label: "Click events" },
    { key: "Unsubscribed", type: "number", label: "Unsubscribes" },
    { key: "Bounced", type: "number", label: "Bounces" },
    { key: "SpamComplaints", type: "number", label: "Spam complaints" },
    { key: "WebVersionURL", type: "string", label: "Public web version" },
    { key: "WorldviewURL", type: "string", label: "Public Worldview report" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<CampaignSummary>(
      `/campaigns/${encodeId(input.campaignId)}/summary`,
    );
  },
};

export default campaignSummaryGet;
