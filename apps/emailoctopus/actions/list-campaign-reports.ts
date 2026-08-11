import type { ActionDefinition } from "@w6w/types";
import {
  EmailOctopusClient,
  type Page,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  seg,
} from "../lib/client.ts";

type ReportStatus =
  | "bounced"
  | "clicked"
  | "complained"
  | "opened"
  | "sent"
  | "unsubscribed"
  | "not-opened"
  | "not-clicked";

interface Input extends PageInput {
  campaignId: string;
  status: ReportStatus;
}

/**
 * `GET /campaigns/{campaign_id}/reports`.
 *
 * **`status` is a REQUIRED query parameter**, which is unusual enough to be
 * worth stating twice: this endpoint has no "all events" mode. One call answers
 * exactly one question ("who opened it?", "who did not click?") and returns the
 * contacts in that bucket, cursor-paginated. Omitting it is a 400.
 *
 * The negative buckets — `not-opened` and `not-clicked` — are computed by
 * EmailOctopus, so there is no need to fetch `sent` and subtract.
 */
const listCampaignReports: ActionDefinition<Input> = {
  key: "list-campaign-reports",
  type: "search",
  resource: "campaign",
  title: "List Campaign Contact Reports",
  description:
    "List the contacts in one campaign engagement bucket — opened, clicked, bounced, complained, sent, unsubscribed, not-opened or not-clicked. The bucket is required; there is no combined feed.",
  params: [
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "status",
      label: "Engagement bucket",
      type: "select",
      required: true,
      options: [
        { value: "sent", label: "Sent" },
        { value: "opened", label: "Opened" },
        { value: "not-opened", label: "Not opened" },
        { value: "clicked", label: "Clicked" },
        { value: "not-clicked", label: "Not clicked" },
        { value: "bounced", label: "Bounced" },
        { value: "complained", label: "Complained" },
        { value: "unsubscribed", label: "Unsubscribed" },
      ],
      hint: "Required by the API — a request without it is rejected with a 400.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "status", type: "string", label: "The bucket that was queried, echoed back" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request<Page>(
      `/campaigns/${seg(input.campaignId)}/reports`,
      { query: { ...pageQuery(input), status: input.status } },
    );
  },
};

export default listCampaignReports;
