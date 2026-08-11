import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { campaignIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/campaigns/{campaignid}/send.json` — send or schedule a draft.
 * **Campaign-level.**
 *
 * ## `idempotent: false`, and this is the one that matters most
 *
 * This spends money and cannot be undone. Campaign Monitor offers **no
 * idempotency key of any kind** — nothing in the request identifies the attempt
 * — so the runtime must never retry it. A second call after a *successful* send
 * is refused with code 331 ("Campaign has already been sent"), which is a
 * safety net rather than a guarantee: the window between the send being accepted
 * and the response being received is exactly where a retry would land.
 *
 * ## `SendDate`
 *
 * The literal string `Immediately`, or `YYYY-MM-DD HH:MM` **in the client's
 * timezone** — not UTC, not the workflow host's clock. Use `system-date-get` to
 * read that clock. A past date is refused with code 337.
 *
 * ## Money and limits
 *
 * "For campaigns with more than 5 recipients, you must have sufficient email
 * credits, a saved credit card or an active monthly billed account" — otherwise
 * codes 335, 336 or 355. Free sends (≤5 recipients) are capped at 50 unique
 * addresses per day, and code 334 means the client is not approved to send to a
 * list this large.
 *
 * The response is a bare `200 OK` with no body, so there is nothing to return
 * but the campaign id and what was requested.
 */
interface Input {
  campaignId: string;
  sendDate?: string;
  confirmationEmail: string;
}

const campaignSend: ActionDefinition<Input, { CampaignID: string; SendDate: string }> = {
  key: "campaign-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description:
    "Send a draft campaign immediately or schedule it for a date and time in the client's " +
    "timezone. Irreversible and billable; never retried automatically.",
  idempotent: false,
  params: [
    campaignIdParam,
    {
      key: "sendDate",
      label: "Send date",
      type: "string",
      default: "Immediately",
      placeholder: "Immediately",
      hint:
        "The literal word Immediately, or YYYY-MM-DD HH:MM in the CLIENT's timezone (not UTC, " +
        "and not this workflow's clock — read it with Get Current Date). A past date is code 337.",
    },
    {
      key: "confirmationEmail",
      label: "Confirmation email(s)",
      type: "string",
      required: true,
      placeholder: "ops@example.com",
      hint:
        "Required by the API (error 338). Up to five comma-separated addresses that receive a " +
        "confirmation once the campaign has gone out.",
    },
  ],
  output: [
    { key: "CampaignID", type: "string", label: "Campaign that was sent or scheduled" },
    { key: "SendDate", type: "string", label: "Send date that was requested" },
  ],

  async execute(input, ctx) {
    const sendDate = input.sendDate && input.sendDate !== "" ? input.sendDate : "Immediately";
    await new CampaignMonitorClient(ctx).json(
      `/campaigns/${encodeId(input.campaignId)}/send`,
      {
        method: "POST",
        body: { ConfirmationEmail: input.confirmationEmail, SendDate: sendDate },
      },
    );
    return { CampaignID: input.campaignId, SendDate: sendDate };
  },
};

export default campaignSend;
