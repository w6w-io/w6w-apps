import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient } from "../lib/client.ts";
import { asOptionalJson, consentToTrackParam, toStringList } from "../lib/params.ts";

/**
 * `POST /api/v3.3/transactional/classicEmail/send?clientID={clientid}` — send a
 * transactional email whose content you supply yourself.
 *
 * The counterpart to `smart-email-send`: there the content lives in Campaign
 * Monitor and you supply variables; here you supply the whole message. Same
 * `202 Accepted` with an **array of `{Status, Recipient, MessageID}`**, one
 * entry per recipient, and the same 25-recipient ceiling across To/CC/BCC (code
 * 954).
 *
 * ## `clientID` is optional, and whether you need it depends on your credential
 *
 * "if you are using an account API key or OAuth, this is required as you need to
 * specify the client. This is not necessary if you use a client-specific API
 * key." Nothing in a stored credential reveals which kind it is, so it is an
 * optional param with the rule at the field.
 *
 * ## `Group` is for reporting, and must not be unique
 *
 * The vendor: "A name to use for grouping email for reporting. **There is a
 * limited number of groups**, so this should not be unique or changed
 * frequently." Using an order id or a user id here exhausts that space. Use
 * `"Password Reset"`, not `"Password Reset 4711"`.
 *
 * `Text` is optional and generated from the HTML when absent, but at least one
 * of `Html` or `Text` is required (code 960). `TrackOpens`, `TrackClicks` and
 * `InlineCSS` all default to **true** at the vendor, so they are exposed with
 * that default rather than left to chance.
 *
 * `idempotent: false` — it sends mail and there is no idempotency key.
 */
interface Input {
  clientId?: string;
  subject: string;
  from: string;
  replyTo?: string;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  html?: string;
  text?: string;
  attachments?: unknown;
  trackOpens?: boolean;
  trackClicks?: boolean;
  inlineCss?: boolean;
  group?: string;
  addRecipientsToListId?: string;
  consentToTrack: string;
}

interface SendResult {
  Status: string;
  Recipient: string;
  MessageID: string;
}

/** Documented ceiling across To + CC + BCC (code 954). */
export const MAX_TRANSACTIONAL_RECIPIENTS = 25;

const classicEmailSend: ActionDefinition<Input, SendResult[]> = {
  key: "classic-email-send",
  type: "perform",
  resource: "transactional",
  title: "Send Classic Transactional Email",
  description:
    "Send a transactional email with content supplied at call time. Returns one MessageID per " +
    "recipient. Sends mail; never retried automatically.",
  idempotent: false,
  params: [
    {
      key: "clientId",
      label: "Client",
      type: "string",
      placeholder: "4a397ccaaa55eb4e6aa1221e1e2d7122",
      hint:
        "REQUIRED if your connection uses an account-wide key or OAuth; leave empty if it uses a " +
        "client-specific key.",
    },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      placeholder: "Mike Smith <mike@example.com>",
      hint:
        'Either "Name <addr@example.com>" or a bare address, 250 characters maximum (code 958). ' +
        "The sending domain must match the account's authenticated domain (code 994).",
    },
    { key: "replyTo", label: "Reply-to", type: "string" },
    {
      key: "to",
      label: "To",
      type: "string",
      hint:
        "Comma-separated. At least one of To, CC or BCC is required (code 952); 25 across all " +
        "three is the limit (code 954).",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    {
      key: "html",
      label: "HTML body",
      type: "code",
      hint: "At least one of HTML or Text is required (code 960).",
    },
    {
      key: "text",
      label: "Text body",
      type: "text",
      hint: "Optional — generated from the HTML when omitted.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint:
        'JSON array of {"Content": "<base64>", "Name": "Invoice.pdf", "Type": "application/pdf"}.',
    },
    { key: "trackOpens", label: "Track opens", type: "boolean", default: true },
    { key: "trackClicks", label: "Track clicks", type: "boolean", default: true },
    { key: "inlineCss", label: "Move CSS inline", type: "boolean", default: true },
    {
      key: "group",
      label: "Reporting group",
      type: "string",
      placeholder: "Password Reset",
      hint:
        "A reporting bucket, NOT a per-message identifier. Campaign Monitor allows only a limited " +
        "number of groups, so use a stable name and never an order or user ID.",
    },
    {
      key: "addRecipientsToListId",
      label: "Add recipients to list ID",
      type: "string",
      hint:
        "Optional list ID. Every recipient including CC and BCC is subscribed to it — you must " +
        "have their permission first.",
    },
    {
      ...consentToTrackParam,
      hint: "Applies to every recipient and to any subscriber with the same address across the " +
        "client's lists. Required (code 974).",
    },
  ],
  output: [
    { key: "Status", type: "string", label: "Accepted, per recipient" },
    { key: "MessageID", type: "string", label: "Message ID — one per recipient, not per call" },
    { key: "Recipient", type: "string", label: "The recipient this entry is for" },
  ],

  execute(input, ctx) {
    const to = toStringList(input.to);
    const cc = toStringList(input.cc);
    const bcc = toStringList(input.bcc);
    const total = (to?.length ?? 0) + (cc?.length ?? 0) + (bcc?.length ?? 0);
    if (total === 0) {
      throw new Error("At least one To, CC or BCC address is required (the API answers code 952).");
    }
    if (total > MAX_TRANSACTIONAL_RECIPIENTS) {
      throw new Error(
        `Campaign Monitor allows at most ${MAX_TRANSACTIONAL_RECIPIENTS} recipients across To, ` +
          `CC and BCC; got ${total}.`,
      );
    }
    if (!input.html && !input.text) {
      throw new Error("Supply an HTML or a text body (the API answers code 960).");
    }
    return new CampaignMonitorClient(ctx).transactional<SendResult[]>("/classicEmail/send", {
      method: "POST",
      query: { clientID: input.clientId },
      body: {
        Subject: input.subject,
        From: input.from,
        ReplyTo: input.replyTo,
        To: to ?? null,
        CC: cc ?? null,
        BCC: bcc ?? null,
        Html: input.html ?? "",
        Text: input.text ?? "",
        Attachments: asOptionalJson<unknown[]>(input.attachments, "Attachments"),
        TrackOpens: input.trackOpens ?? true,
        TrackClicks: input.trackClicks ?? true,
        InlineCSS: input.inlineCss ?? true,
        Group: input.group,
        AddRecipientsToListID: input.addRecipientsToListId,
        ConsentToTrack: input.consentToTrack,
      },
    });
  },
};

export default classicEmailSend;
