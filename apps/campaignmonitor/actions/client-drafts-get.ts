import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3.3/clients/{clientid}/drafts.json` — the client's draft campaigns.
 * **Client-level.**
 *
 * Unlike sent campaigns, this one is **not paged** — it returns a bare array,
 * and the v3.3 change list adds only `Tags` to it. So the two endpoints that
 * both "list campaigns" have different response shapes, which is the sort of
 * asymmetry that a wrapper hides and a hand-rolled integration trips over.
 *
 * `CampaignID` from here is what `campaign-send` and `campaign-send-preview`
 * take.
 */
interface Input {
  clientId: string;
}

interface DraftCampaign {
  CampaignID: string;
  Name: string;
  Subject: string;
  FromName: string;
  FromEmail: string;
  ReplyTo: string;
  DateCreated: string;
  PreviewURL?: string;
  PreviewTextURL?: string;
  Tags?: string[];
}

const clientDraftsGet: ActionDefinition<Input, DraftCampaign[]> = {
  key: "client-drafts-get",
  type: "search",
  resource: "campaign",
  title: "Get Draft Campaigns",
  description:
    "List a client's draft campaigns with their IDs, subjects, sender details and tags. Returns " +
    "a bare array, not a paged result.",
  params: [clientIdParam],
  output: [
    { key: "CampaignID", type: "string", label: "Campaign ID" },
    { key: "Name", type: "string", label: "Campaign name" },
    { key: "Subject", type: "string", label: "Subject line" },
    { key: "DateCreated", type: "string", label: "When the draft was created" },
    { key: "Tags", type: "array", label: "Tags" },
  ],

  execute(input, ctx) {
    return new CampaignMonitorClient(ctx).json<DraftCampaign[]>(
      `/clients/${encodeId(input.clientId)}/drafts`,
    );
  },
};

export default clientDraftsGet;
