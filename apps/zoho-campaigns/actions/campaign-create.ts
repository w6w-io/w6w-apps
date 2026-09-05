import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";

interface Input {
  campaignName: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  contentUrl?: string;
  listDetails?: unknown;
  segments?: string;
  topicId?: string;
}

interface Output {
  message?: string;
  campaignKey?: string;
}

/**
 * `POST /createCampaign` — verified against
 * `https://www.zoho.com/campaigns/help/developers/create-campaign.html`.
 * Either `listDetails` or `segments` decides the recipients — if both are
 * given, lists take precedence (documented vendor behaviour, not this app's
 * choice). `topicId` is mandatory on an account that has the newer topic
 * management enabled; this app has no way to detect that ahead of time.
 */
const campaignCreate: ActionDefinition<Input, Output> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description:
    "Create a draft campaign — name, subject, sender and recipients (a mailing list, a segment, " +
    "or a topic). Content is set separately via `contentUrl` (a public HTML URL) or in the Zoho " +
    "Campaigns UI before sending.",
  idempotent: false,
  params: [
    { key: "campaignName", label: "Campaign name", type: "string", required: true },
    { key: "fromEmail", label: "From email", type: "string", required: true },
    { key: "fromName", label: "From name", type: "string" },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "contentUrl",
      label: "Content URL",
      type: "string",
      hint: "A public HTML URL to import as the campaign's content.",
    },
    {
      key: "listDetails",
      label: "List details",
      type: "json",
      hint: 'Mailing lists to send to, e.g. { "listkey1": [], "listkey2": [] }. Takes precedence ' +
        "over Segments if both are set.",
    },
    {
      key: "segments",
      label: "Segments",
      type: "string",
      hint: "Segment ids to send to, e.g. [segmentid1,segmentid2]. Ignored if List details is set.",
    },
    {
      key: "topicId",
      label: "Topic ID",
      type: "string",
      hint: "Required if this account has topic management enabled.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
    { key: "campaignKey", type: "string", label: "Campaign key" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { message?: string; campaignKey?: string }
    >("createCampaign", {
      method: "POST",
      query: {
        campaignname: input.campaignName,
        from_email: input.fromEmail,
        from_name: input.fromName,
        subject: input.subject,
        content_url: input.contentUrl,
        list_details: input.listDetails !== undefined
          ? JSON.stringify(input.listDetails)
          : undefined,
        segments: input.segments,
        topicId: input.topicId,
      },
    });
    return { message: body.message, campaignKey: body.campaignKey };
  },
};

export default campaignCreate;
