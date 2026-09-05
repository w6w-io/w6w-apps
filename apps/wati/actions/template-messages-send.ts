import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, WatiClient } from "../lib/client.ts";

interface Input {
  channel?: string;
  templateName: string;
  broadcastName: string;
  recipients: unknown;
}

interface TemplateMessageRecipientResultDto {
  local_message_id?: string;
  phone_number?: string;
  target?: string;
  errors?: string[];
}

interface SendTemplateMessagesResponse {
  success?: boolean;
  broadcast_id?: string;
  error?: string;
  recipients?: TemplateMessageRecipientResultDto[];
}

/**
 * `POST /api/ext/v3/messageTemplates/send` — verified against the embedded OpenAPI document
 * 2026-09-05. Sends an approved WhatsApp template to 1–10,000 recipients in one call, creating a
 * broadcast. Each recipient needs a `phone_number` or a `target` (a polymorphic ContactId/
 * phone/BSUID the server resolves), plus optional `custom_params` for the template's own
 * placeholders.
 *
 * The operation's own description states: "Status code 200 means the message was accepted by
 * WATI, not delivered yet" — same caveat as `message-text-send`, plus this is also the
 * documented way to OPEN a new 24-hour session with a recipient who has none.
 *
 * Not marked idempotent: retrying re-sends the template (and re-spends credit) to every
 * recipient.
 */
const action: ActionDefinition<Input, SendTemplateMessagesResponse> = {
  key: "template-messages-send",
  type: "perform",
  resource: "templates",
  title: "Send Template Message",
  description: "Send an approved WhatsApp template message to one or more recipients.",
  idempotent: false,
  params: [
    {
      key: "channel",
      label: "Channel",
      type: "string",
      hint: "Name or phone number of the sending channel. Omit for the default channel.",
    },
    { key: "templateName", label: "Template Name", type: "string", required: true },
    { key: "broadcastName", label: "Broadcast Name", type: "string", required: true },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint: 'A JSON array of `{"phone_number": "...", "target": "...", "local_message_id": ' +
        '"...", "custom_params": [{"name": "...", "value": "..."}]}` objects (1 to 10,000 ' +
        "items). Either `phone_number` or `target` is required per recipient.",
    },
  ],
  output: [
    { key: "success", label: "Success", type: "boolean" },
    { key: "broadcast_id", label: "Broadcast ID", type: "string" },
    { key: "recipients", label: "Per-Recipient Results", type: "array" },
  ],

  async execute(input, ctx) {
    const recipients = parseJson(input.recipients, "recipients");
    ctx.log("info", "sending Wati template message", {
      templateName: input.templateName,
      recipientCount: Array.isArray(recipients) ? recipients.length : undefined,
    });
    return await new WatiClient(ctx).post<SendTemplateMessagesResponse>(
      "/messageTemplates/send",
      compact({
        channel: input.channel,
        template_name: input.templateName,
        broadcast_name: input.broadcastName,
        recipients,
      }),
    );
  },
};

export default action;
