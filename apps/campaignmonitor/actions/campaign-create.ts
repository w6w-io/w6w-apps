import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { asOptionalJson, clientIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/campaigns/{clientid}.json` — create a draft campaign.
 * **Client-level.** It does not send anything; `campaign-send` does that.
 *
 * ## The content is a URL, not a body
 *
 * `HtmlUrl` points at a page Campaign Monitor **fetches and imports**. There is
 * no way to POST HTML directly on this endpoint (the template endpoint,
 * `fromtemplate`, is the alternative for structured content). If the fetch or
 * parse fails you get codes 310/311/316/317; if the content contains JavaScript,
 * Flash or Java you get 4201/4202/4203 and the campaign is refused outright.
 *
 * `TextUrl` is optional — omit it and the text part is generated from the HTML.
 *
 * ## Lists XOR segments
 *
 * The vendor: "If you are using the `SegmentIDs` section, **remove the
 * `ListIDs` section** from your request." At least one of the two is required
 * (code 315). This action sends only the one that is populated, and refuses to
 * send both, rather than letting the API decide.
 *
 * ## The unsubscribe tag is mandatory
 *
 * Campaign Monitor requires a single-click unsubscribe link: HTML content
 * carrying only the text form `{[unsubscribe]}` is refused with code 318, and
 * codes 4302/4303/4304/4306/4307 each name a different way of getting the
 * `<unsubscribe>…</unsubscribe>` tags wrong.
 *
 * Responds with the new campaign id as a **bare JSON string**, wrapped here.
 * `idempotent: false`: a repeat with the same `Name` fails with code 303.
 */
interface Input {
  clientId: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  htmlUrl: string;
  textUrl?: string;
  listIds?: unknown;
  segmentIds?: unknown;
  inlineCss?: boolean;
}

const campaignCreate: ActionDefinition<Input, { CampaignID: string }> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create Campaign",
  description:
    "Create a draft campaign from a hosted HTML URL, targeted at lists or at segments (not " +
    "both). Returns the campaign ID; sending is a separate action.",
  idempotent: false,
  params: [
    clientIdParam,
    {
      key: "name",
      label: "Campaign name",
      type: "string",
      required: true,
      hint: "Internal name, must be unique for the client (error 303).",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "fromName",
      label: "From name",
      type: "string",
      required: true,
      hint: "May contain custom-field personalization tags, but no other tag type (error 322).",
    },
    {
      key: "fromEmail",
      label: "From email",
      type: "string",
      required: true,
      hint: "A personalized from address needs a fallback, e.g. [customfield,fallback=a@b.com] " +
        "(error 323).",
    },
    {
      key: "replyTo",
      label: "Reply-to email",
      type: "string",
      required: true,
      hint: "Required by the API (error 308).",
    },
    {
      key: "htmlUrl",
      label: "HTML content URL",
      type: "string",
      required: true,
      hint:
        "A publicly reachable URL that Campaign Monitor fetches and imports. The content must " +
        "contain a single-click <unsubscribe> tag pair or the campaign is refused (error 318).",
    },
    {
      key: "textUrl",
      label: "Text content URL",
      type: "string",
      hint: "Optional. Omit it and the plain-text part is generated from the HTML.",
    },
    {
      key: "listIds",
      label: "List IDs",
      type: "json",
      hint: 'JSON array of list IDs, e.g. ["a58ee1…"]. Use this OR segment IDs, never both.',
    },
    {
      key: "segmentIds",
      label: "Segment IDs",
      type: "json",
      hint:
        "JSON array of segment IDs. Use this OR list IDs, never both. Allow about an hour after " +
        "changing segment rules or importing subscribers for a segment to finish calculating.",
    },
    {
      key: "inlineCss",
      label: "Move CSS inline",
      type: "boolean",
      default: true,
      hint: "The API's own default is true.",
    },
  ],
  output: [{ key: "CampaignID", type: "string", label: "ID of the new draft campaign" }],

  async execute(input, ctx) {
    const listIds = asOptionalJson<string[]>(input.listIds, "List IDs");
    const segmentIds = asOptionalJson<string[]>(input.segmentIds, "Segment IDs");
    const hasLists = Array.isArray(listIds) && listIds.length > 0;
    const hasSegments = Array.isArray(segmentIds) && segmentIds.length > 0;
    if (hasLists && hasSegments) {
      throw new Error(
        "Supply list IDs or segment IDs, not both — Campaign Monitor requires the ListIDs " +
          "section to be absent when SegmentIDs is used.",
      );
    }
    if (!hasLists && !hasSegments) {
      throw new Error("Supply at least one list ID or segment ID (the API answers code 315).");
    }

    const campaignId = await new CampaignMonitorClient(ctx).json<string>(
      `/campaigns/${encodeId(input.clientId)}`,
      {
        method: "POST",
        body: {
          Name: input.name,
          Subject: input.subject,
          FromName: input.fromName,
          FromEmail: input.fromEmail,
          ReplyTo: input.replyTo,
          HtmlUrl: input.htmlUrl,
          TextUrl: input.textUrl,
          ...(hasLists ? { ListIDs: listIds } : { SegmentIDs: segmentIds }),
          InlineCss: input.inlineCss ?? true,
        },
      },
    );
    return { CampaignID: campaignId };
  },
};

export default campaignCreate;
