import type { ActionDefinition } from "@w6w/types";
import { compact, GetResponseClient, toList } from "../lib/client.ts";

/**
 * `POST /newsletters` — create and send a broadcast.
 *
 * ## This action sends email. Five fields are required and each is a lookup
 *
 * The vendor's spec marks `subject`, `fromField`, `campaign`, `content` and
 * `sendSettings` required, and three of them are ids you have to fetch first:
 *
 *   - `fromField` — `{fromFieldId}`, from **List From Fields**. A verified
 *     sender address; an unverified one is rejected.
 *   - `campaign` — `{campaignId}`, from **List Campaigns**. Which list to send
 *     to.
 *   - `content` — `{html}` and/or `{plain}`.
 *
 * ## `sendSettings.selectedCampaigns` is what actually addresses the send
 *
 * The top-level `campaign` says which campaign the newsletter *belongs to*;
 * `sendSettings.selectedCampaigns` says who it goes **to**. They are usually the
 * same id, and this action defaults the second from the first so the common case
 * is one field — but they are separate in the API and a send to a different
 * audience is expressible by naming it.
 *
 * `sendSettings.selectedContacts` and `excludedCampaigns` narrow it further.
 *
 * ## Not idempotent, and it is not undoable either
 *
 * There is no idempotency key. A repeat is a second broadcast to real people,
 * which is why this is `idempotent: false` and why the description says what it
 * does before it says how.
 */
interface Input {
  subject: string;
  fromFieldId: string;
  campaignId: string;
  html?: string;
  plain?: string;
  name?: string;
  sendToCampaignIds?: string;
  replyToFieldId?: string;
  sendOn?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  editor?: string;
}

const newsletterCreate: ActionDefinition<Input> = {
  key: "newsletter-create",
  type: "perform",
  resource: "newsletter",
  title: "Create Newsletter",
  description:
    "Create and queue a broadcast newsletter to a campaign's contacts. This sends real email and " +
    "cannot be undone once it starts.",
  idempotent: false,
  params: [
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "fromFieldId",
      label: "From field ID",
      type: "string",
      required: true,
      hint: "A verified sender address, from List From Fields. An unverified one is rejected.",
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      required: true,
      hint: "The campaign the newsletter belongs to, and by default the audience it goes to.",
    },
    {
      key: "html",
      label: "HTML content",
      type: "text",
      hint: "At least one of HTML or Plain text is required.",
    },
    { key: "plain", label: "Plain text content", type: "text" },
    {
      key: "name",
      label: "Internal name",
      type: "string",
      hint: "Shown in the GetResponse UI. Defaults to the subject.",
    },
    {
      key: "sendToCampaignIds",
      label: "Send to campaigns",
      type: "string",
      hint:
        "Comma-separated campaign ids that will actually receive it. Defaults to the campaign " +
        "above — set this only when the audience differs from the owning campaign.",
    },
    {
      key: "replyToFieldId",
      label: "Reply-to field ID",
      type: "string",
      hint: "Another from-field id. Defaults to the sender.",
    },
    {
      key: "sendOn",
      label: "Send at",
      type: "datetime",
      hint: "ISO 8601. Omit to queue it for immediate sending.",
    },
    { key: "trackOpens", label: "Track opens", type: "boolean" },
    { key: "trackClicks", label: "Track clicks", type: "boolean" },
    {
      key: "editor",
      label: "Editor",
      type: "select",
      options: [
        { value: "custom", label: "Custom — raw HTML you supply (default)" },
        { value: "plain", label: "Plain" },
        { value: "getresponse", label: "GetResponse editor" },
        { value: "move", label: "Move (drag and drop)" },
      ],
      hint: "How GetResponse should treat the content. `custom` is right for HTML you built.",
    },
  ],
  output: [
    { key: "newsletterId", type: "string", label: "The created newsletter's id" },
    { key: "status", type: "string", label: "`enqueued` until sending starts" },
  ],

  execute(input, ctx) {
    if (!input.html && !input.plain) {
      throw new Error("A newsletter needs content — supply HTML content, plain text, or both.");
    }

    // The owning campaign is the default audience; naming others overrides it.
    const selectedCampaigns = toList(input.sendToCampaignIds) ?? [input.campaignId];

    return new GetResponseClient(ctx).request("/newsletters", {
      method: "POST",
      body: compact({
        subject: input.subject,
        name: input.name ?? input.subject,
        type: "broadcast",
        editor: input.editor ?? "custom",
        fromField: { fromFieldId: input.fromFieldId },
        replyTo: input.replyToFieldId ? { fromFieldId: input.replyToFieldId } : undefined,
        campaign: { campaignId: input.campaignId },
        content: compact({ html: input.html, plain: input.plain }),
        sendSettings: compact({
          selectedCampaigns,
          timeTravel: undefined,
          perfectTiming: undefined,
        }),
        sendOn: input.sendOn,
        trackOpens: input.trackOpens,
        trackClicks: input.trackClicks,
      }),
    });
  },
};

export default newsletterCreate;
