import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, compact, RespondioClient } from "../lib/client.ts";
import { attachmentTypeOptions, messageTagOptions, messageTypeOptions } from "../lib/params.ts";

/**
 * `POST /contact/{identifier}/message` — `MessagingClient.send` in the
 * official SDK. `SendMessageRequest.message` is a union over six shapes
 * (`Message` in `src/types/message.ts`); this action exposes one `messageType`
 * select and shows only the fields that type needs, then assembles the exact
 * union member the SDK types.
 *
 * `channelId` is optional in general but is how a WhatsApp template message
 * names which connected WhatsApp channel to send from — the README's own
 * template example sets it.
 *
 * Never idempotent: retrying a send is a second message, not a safe repeat.
 */
type MessageType =
  | "text"
  | "attachment"
  | "whatsapp_template"
  | "email"
  | "quick_reply"
  | "custom_payload";

interface Input {
  identifier: string;
  channelId?: number;
  messageType: MessageType;
  // text
  text?: string;
  messageTag?: string;
  // attachment
  attachmentType?: "image" | "video" | "audio" | "file";
  attachmentUrl?: string;
  // email
  emailSubject?: string;
  emailBcc?: string[] | string;
  emailCc?: string[] | string;
  emailReplyToMessageId?: number;
  // quick_reply
  quickReplyTitle?: string;
  quickReplyReplies?: string[] | string;
  // whatsapp_template
  templateName?: string;
  templateLanguageCode?: string;
  templateComponents?: unknown;
  // custom_payload
  customPayload?: unknown;
}

function toArray(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined || v === "") return undefined;
  const items = Array.isArray(v) ? v : [v];
  return items.map((s) => String(s).trim()).filter(Boolean);
}

function parseJson(value: unknown, label: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

function buildMessage(input: Input): Record<string, unknown> {
  switch (input.messageType) {
    case "text":
      if (!input.text) throw new Error('"Text" is required for a text message');
      return compact({ type: "text", text: input.text, messageTag: input.messageTag });
    case "attachment":
      if (!input.attachmentType || !input.attachmentUrl) {
        throw new Error('"Attachment type" and "Attachment URL" are required');
      }
      return {
        type: "attachment",
        attachment: { type: input.attachmentType, url: input.attachmentUrl },
      };
    case "email":
      if (!input.text) throw new Error('"Text" (the email body) is required');
      return compact({
        type: "email",
        text: input.text,
        subject: input.emailSubject,
        bcc: toArray(input.emailBcc),
        cc: toArray(input.emailCc),
        replyToMessageId: input.emailReplyToMessageId,
      });
    case "quick_reply": {
      const replies = toArray(input.quickReplyReplies);
      if (!input.quickReplyTitle || !replies?.length) {
        throw new Error('"Title" and at least one reply are required for a quick reply');
      }
      return { type: "quick_reply", title: input.quickReplyTitle, replies };
    }
    case "custom_payload": {
      const payload = parseJson(input.customPayload, "Payload");
      if (!payload || typeof payload !== "object") {
        throw new Error('"Payload" is required and must be a JSON object');
      }
      return { type: "custom_payload", payload };
    }
    case "whatsapp_template": {
      if (!input.templateName || !input.templateLanguageCode) {
        throw new Error('"Template name" and "Template language" are required');
      }
      const components = parseJson(input.templateComponents, "Template components");
      return {
        type: "whatsapp_template",
        template: compact({
          name: input.templateName,
          languageCode: input.templateLanguageCode,
          components,
        }),
      };
    }
    default:
      throw new Error(`Unknown message type "${input.messageType}"`);
  }
}

const messageSend: ActionDefinition<Input> = {
  key: "message-send",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a message to a contact over any of its connected channels.",
  idempotent: false,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "messageType",
      label: "Message type",
      type: "select",
      required: true,
      default: "text",
      options: messageTypeOptions,
    },
    {
      key: "channelId",
      label: "Channel ID",
      type: "number",
      advanced: true,
      hint: "Which connected channel to send from. Required for a WhatsApp template message; " +
        "see Space: List Channels.",
    },
    {
      key: "text",
      label: "Text",
      type: "text",
      showIf: { "in": [{ var: "messageType" }, ["text", "email"]] },
      hint: 'Supports "{{$contact.field}}" dynamic variables.',
    },
    {
      key: "messageTag",
      label: "Facebook message tag",
      type: "select",
      options: messageTagOptions,
      advanced: true,
      showIf: { "==": [{ var: "messageType" }, "text"] },
      hint: "Allows a Messenger message outside the normal 24-hour window.",
    },
    {
      key: "attachmentType",
      label: "Attachment type",
      type: "select",
      options: attachmentTypeOptions,
      showIf: { "==": [{ var: "messageType" }, "attachment"] },
    },
    {
      key: "attachmentUrl",
      label: "Attachment URL",
      type: "string",
      showIf: { "==": [{ var: "messageType" }, "attachment"] },
    },
    {
      key: "emailSubject",
      label: "Email subject",
      type: "string",
      showIf: { "==": [{ var: "messageType" }, "email"] },
    },
    {
      key: "emailCc",
      label: "Email Cc",
      type: "array",
      item: { type: "string" },
      advanced: true,
      showIf: { "==": [{ var: "messageType" }, "email"] },
    },
    {
      key: "emailBcc",
      label: "Email Bcc",
      type: "array",
      item: { type: "string" },
      advanced: true,
      showIf: { "==": [{ var: "messageType" }, "email"] },
    },
    {
      key: "emailReplyToMessageId",
      label: "Reply to message ID",
      type: "number",
      advanced: true,
      showIf: { "==": [{ var: "messageType" }, "email"] },
    },
    {
      key: "quickReplyTitle",
      label: "Title",
      type: "string",
      showIf: { "==": [{ var: "messageType" }, "quick_reply"] },
    },
    {
      key: "quickReplyReplies",
      label: "Replies",
      type: "array",
      item: { type: "string" },
      showIf: { "==": [{ var: "messageType" }, "quick_reply"] },
    },
    {
      key: "customPayload",
      label: "Payload",
      type: "json",
      showIf: { "==": [{ var: "messageType" }, "custom_payload"] },
      hint: "Arbitrary JSON object, forwarded to the channel as-is.",
    },
    {
      key: "templateName",
      label: "Template name",
      type: "string",
      showIf: { "==": [{ var: "messageType" }, "whatsapp_template"] },
    },
    {
      key: "templateLanguageCode",
      label: "Template language",
      type: "string",
      showIf: { "==": [{ var: "messageType" }, "whatsapp_template"] },
      hint: 'e.g. "en".',
    },
    {
      key: "templateComponents",
      label: "Template components",
      type: "json",
      advanced: true,
      showIf: { "==": [{ var: "messageType" }, "whatsapp_template"] },
      hint: "Raw TemplateComponent[] JSON (header/body/footer/buttons with their parameters).",
    },
  ],
  output: [{ key: "messageId", type: "number", label: "Message ID" }],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    const message = buildMessage(input);
    return new RespondioClient(ctx).post(
      `/contact/${identifier}/message`,
      compact({ channelId: input.channelId, message }),
    );
  },
};

export default messageSend;
