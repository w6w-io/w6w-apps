import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { asOptionalJson, consentToTrackParam, toStringList } from "../lib/params.ts";

/**
 * `POST /api/v3.3/transactional/smartEmail/{smartEmailID}/send` — deliver a
 * smart transactional email.
 *
 * ## `idempotent: false`
 *
 * It sends mail and Campaign Monitor offers no idempotency key, so a retry sends
 * again. Unlike `campaign-send`, there is not even a "already sent" guard: every
 * call is a fresh delivery.
 *
 * ## The response is an ARRAY, one entry per recipient
 *
 * `202 Accepted` with `[{Status, MessageID, Recipient}, …]`. There is no single
 * message id for the call — each recipient gets its own, which is what
 * `transactional-messages-get` and the message-detail endpoint index by. A
 * workflow that stores "the" message id will store one recipient's.
 *
 * ## Limits and shapes
 *
 *  - **25 recipients maximum** across `To`, `CC` and `BCC` combined (code 954),
 *    checked here before the request so the error names the cause.
 *  - Each address may be `"Name <addr@example.com>"` or bare, capped at 250
 *    characters including the name (code 953).
 *  - `Data` merges into the template's `EmailVariables` — read them with
 *    `smart-email-get`. Maximum 100 KB (code 996).
 *  - `AddRecipientsToList` is a **boolean** here (add them to the list the smart
 *    email names), where the same field on `smart-email-get` is a list id.
 *    Turning it on subscribes everyone including CC and BCC, which the vendor
 *    warns needs prior permission.
 *  - Attachments are `{Content: base64, Name, Type}` (codes 981/982/984).
 *
 * Code 980 means transactional is not on this plan; 993/994 mean the account's
 * sending-domain authentication is not set up.
 */
interface Input {
  smartEmailId: string;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  data?: unknown;
  attachments?: unknown;
  addRecipientsToList?: boolean;
  consentToTrack: string;
}

interface SendResult {
  Status: string;
  MessageID: string;
  Recipient: string;
}

/** Documented ceiling across To + CC + BCC (code 954). */
export const MAX_TRANSACTIONAL_RECIPIENTS = 25;

const smartEmailSend: ActionDefinition<Input, SendResult[]> = {
  key: "smart-email-send",
  type: "perform",
  resource: "transactional",
  title: "Send Smart Transactional Email",
  description:
    "Send a smart transactional email, merging a data object into the template's variables. " +
    "Returns one MessageID per recipient. Sends mail; never retried automatically.",
  idempotent: false,
  params: [
    {
      key: "smartEmailId",
      label: "Smart email",
      type: "string",
      required: true,
      placeholder: "c475db61-665e-11eb-b2b7-51b1f4471faa",
      hint: "A GUID, from List Smart Transactional Emails.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      hint:
        'Comma-separated. Each may be "Name <addr@example.com>" or a bare address. At least one ' +
        "of To, CC or BCC is required (code 952); 25 across all three is the limit.",
    },
    { key: "cc", label: "CC", type: "string" },
    { key: "bcc", label: "BCC", type: "string" },
    {
      key: "data",
      label: "Data",
      type: "json",
      hint:
        "JSON object merged into the template's variables. Run Get Smart Transactional Email to " +
        "see exactly which names it expects. Maximum 100 KB.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      hint:
        'JSON array of {"Content": "<base64>", "Name": "Invoice.pdf", "Type": "application/pdf"}. ' +
        "All three fields are required per attachment.",
    },
    {
      key: "addRecipientsToList",
      label: "Add recipients to the smart email's list",
      type: "boolean",
      hint:
        "Off by default. On, every recipient including CC and BCC is subscribed to the list the " +
        "smart email names — you must have their permission first.",
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
    return new CampaignMonitorClient(ctx).transactional<SendResult[]>(
      `/smartEmail/${encodeId(input.smartEmailId)}/send`,
      {
        method: "POST",
        body: {
          To: to ?? null,
          CC: cc ?? null,
          BCC: bcc ?? null,
          Data: asOptionalJson<Record<string, unknown>>(input.data, "Data"),
          Attachments: asOptionalJson<unknown[]>(input.attachments, "Attachments"),
          AddRecipientsToList: input.addRecipientsToList ?? false,
          ConsentToTrack: input.consentToTrack,
        },
      },
    );
  },
};

export default smartEmailSend;
