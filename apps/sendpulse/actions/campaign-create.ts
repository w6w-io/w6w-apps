import type { ActionDefinition } from "@w6w/types";
import { compact, SendPulseClient, toBase64 } from "../lib/client.ts";

interface Input {
  senderName: string;
  senderEmail: string;
  subject: string;
  listId: number;
  body?: string;
  templateId?: string;
  name?: string;
  isTest?: boolean;
  sendDate?: string;
}

/**
 * `POST /campaigns` — creates and, unless `sendDate` is in the future, starts
 * sending a campaign immediately. Two vendor requirements this action
 * enforces before the request ever goes out, because SendPulse's own error
 * for either is a bare `403`/`401` with no field-level detail:
 *
 *   - one of `body` or `template_id` is required — this app supports `body`
 *     (raw HTML, **base64-encoded** here, per the vendor's
 *     `CampaignCreateRequest` schema) and leaves template-based sends for a
 *     future `template-list`/`template-get` pair;
 *   - a mailing list (`list_id`) is required — `segment_id` (a saved segment)
 *     is a second, mutually exclusive way to target a campaign that this
 *     action does not expose, since this app has no segment actions to
 *     produce one.
 *
 * There is no idempotency key of any kind on this endpoint — a retried call
 * sends the campaign a second time to every recipient.
 */
const action: ActionDefinition<Input> = {
  key: "campaign-create",
  type: "perform",
  resource: "campaign",
  title: "Create a campaign",
  description: "Create and send (or schedule) an email campaign against one mailing list.",
  idempotent: false,
  params: [
    { key: "senderName", label: "Sender name", type: "string", required: true },
    { key: "senderEmail", label: "Sender email", type: "string", required: true },
    { key: "subject", label: "Subject", type: "string", required: true },
    {
      key: "listId",
      label: "Mailing list ID",
      type: "number",
      required: true,
      hint: "From `mailing-lists-list`.",
    },
    {
      key: "body",
      label: "HTML body",
      type: "text",
      hint: "Raw HTML — base64-encoded for you before it's sent. Required unless " +
        "Template ID is set.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "A template already created in SendPulse. Use instead of HTML body.",
    },
    { key: "name", label: "Campaign name", type: "string" },
    {
      key: "isTest",
      label: "Send as test",
      type: "boolean",
      default: false,
      hint: "Sends only to the sender's own address.",
    },
    {
      key: "sendDate",
      label: "Scheduled send time",
      type: "datetime",
      hint: "Leave blank to send immediately. Must not be in the past.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "status", type: "number", label: "Task status (13 = queued, 26 = draft)" },
    { key: "count", type: "number", label: "Recipient count" },
  ],

  async execute(input, ctx) {
    if (!input.body && !input.templateId) {
      throw new Error("either `body` or `templateId` is required");
    }
    const body = compact({
      sender_name: input.senderName,
      sender_email: input.senderEmail,
      subject: input.subject,
      list_id: input.listId,
      body: input.body ? toBase64(input.body) : undefined,
      template_id: input.templateId,
      name: input.name,
      is_test: input.isTest === true ? true : undefined,
      send_date: input.sendDate,
    });
    return await new SendPulseClient(ctx).bulkEmail("/campaigns", { method: "POST", body });
  },
};

export default action;
