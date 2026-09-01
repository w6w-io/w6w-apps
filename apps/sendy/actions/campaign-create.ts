import type { ActionDefinition } from "@w6w/types";
import { CREATE_CAMPAIGN_PATH, expectSuccess, sendyPost } from "../lib/client.ts";

interface Input {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  title: string;
  subject: string;
  htmlText: string;
  plainText?: string;
  listIds?: string;
  segmentIds?: string;
  excludeListIds?: string;
  excludeSegmentIds?: string;
  brandId?: string;
  queryString?: string;
  trackOpens?: "0" | "1" | "2";
  trackClicks?: "0" | "1" | "2";
  sendCampaign?: boolean;
  scheduleDateTime?: string;
  scheduleTimezone?: string;
}

const SUCCESS = ["Campaign created", "Campaign created and now sending", "Campaign scheduled"];

/**
 * `POST /api/campaigns/create.php` — create a draft, send immediately, or
 * schedule a campaign, depending on `sendCampaign` / `scheduleDateTime`.
 *
 * Not idempotent: every call that succeeds creates a NEW campaign, so a
 * retry after a timeout duplicates the send rather than reusing it.
 *
 * Sendy requires a cron job configured on the installation for a sent or
 * scheduled campaign to actually go out — this action only records what
 * Sendy's own API call reports back, per the vendor's docs.
 */
const campaignCreate: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description:
    "Create a draft campaign, or create and send/schedule one. Requires a cron job configured " +
    "on the Sendy installation for sending to actually happen.",
  idempotent: false,
  params: [
    { key: "fromName", label: "From Name", type: "string", required: true },
    { key: "fromEmail", label: "From Email", type: "string", required: true },
    { key: "replyTo", label: "Reply To", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string", required: true },
    { key: "htmlText", label: "HTML Version", type: "text", required: true },
    { key: "plainText", label: "Plain Text Version", type: "text" },
    {
      key: "listIds",
      label: "List IDs",
      type: "string",
      hint: "Single or comma-separated list ids. Required to send unless Segment IDs are set.",
    },
    {
      key: "segmentIds",
      label: "Segment IDs",
      type: "string",
      hint: "Single or comma-separated segment ids. Required to send unless List IDs are set.",
    },
    {
      key: "excludeListIds",
      label: "Exclude List IDs",
      type: "string",
      hint: "Lists to exclude. Single or comma-separated.",
    },
    {
      key: "excludeSegmentIds",
      label: "Exclude Segment IDs",
      type: "string",
      hint: "Segments to exclude. Single or comma-separated.",
    },
    {
      key: "brandId",
      label: "Brand ID",
      type: "string",
      hint: "Required when creating a draft (Send Campaign left off).",
    },
    {
      key: "queryString",
      label: "Query String",
      type: "string",
      hint: "e.g. Google Analytics tags.",
    },
    {
      key: "trackOpens",
      label: "Track Opens",
      type: "select",
      options: [
        { value: "0", label: "Disabled" },
        { value: "1", label: "Enabled" },
        { value: "2", label: "Anonymous" },
      ],
    },
    {
      key: "trackClicks",
      label: "Track Clicks",
      type: "select",
      options: [
        { value: "0", label: "Disabled" },
        { value: "1", label: "Enabled" },
        { value: "2", label: "Anonymous" },
      ],
    },
    {
      key: "sendCampaign",
      label: "Send Campaign",
      type: "boolean",
      default: false,
      hint: "Send (or schedule) the campaign instead of leaving it a draft.",
    },
    {
      key: "scheduleDateTime",
      label: "Schedule Date/Time",
      type: "string",
      hint: 'e.g. "June 15, 2021 6:05pm". Minutes must be in increments of 5.',
    },
    {
      key: "scheduleTimezone",
      label: "Schedule Timezone",
      type: "string",
      hint: 'e.g. "America/New_York". Only applies with Schedule Date/Time set; defaults to the ' +
        "installation's own timezone.",
    },
  ],
  output: [{ key: "message", type: "string", label: "Result" }],

  async execute(input, ctx) {
    ctx.log("info", "creating campaign", { title: input.title });
    const text = await sendyPost(ctx, CREATE_CAMPAIGN_PATH, {
      from_name: input.fromName,
      from_email: input.fromEmail,
      reply_to: input.replyTo,
      title: input.title,
      subject: input.subject,
      plain_text: input.plainText,
      html_text: input.htmlText,
      list_ids: input.listIds,
      segment_ids: input.segmentIds,
      exclude_list_ids: input.excludeListIds,
      exclude_segments_ids: input.excludeSegmentIds,
      brand_id: input.brandId,
      query_string: input.queryString,
      track_opens: input.trackOpens,
      track_clicks: input.trackClicks,
      send_campaign: input.sendCampaign ? "1" : undefined,
      schedule_date_time: input.scheduleDateTime,
      schedule_timezone: input.scheduleTimezone,
    });
    expectSuccess(CREATE_CAMPAIGN_PATH, text, SUCCESS);
    return { message: text };
  },
};

export default campaignCreate;
