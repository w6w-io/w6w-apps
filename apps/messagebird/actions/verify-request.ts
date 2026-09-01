import type { ActionDefinition } from "@w6w/types";
import { MessageBirdClient } from "../lib/client.ts";
import { toMsisdn, TTS_LANGUAGE_OPTIONS, TTS_VOICE_OPTIONS } from "../lib/params.ts";

interface Input {
  recipient: string;
  originator?: string;
  type?: "sms" | "flash" | "tts" | "email";
  reference?: string;
  template?: string;
  datacoding?: "plain" | "unicode" | "auto";
  timeout?: number;
  tokenLength?: number;
  maxAttempts?: number;
  voice?: "male" | "female";
  language?: string;
  subject?: string;
}

/**
 * Start a one-time-code verification: `POST /verify`. Sends a token to the
 * recipient by SMS (default), flash SMS, a spoken TTS call, or email. Verified
 * against developers.messagebird.com/api/verify/#request-a-verify.
 */
const verifyRequest: ActionDefinition<Input> = {
  key: "verify-request",
  type: "perform",
  resource: "verify",
  title: "Request Verification Code",
  description: "Send a one-time verification code to a phone number or email address.",
  idempotent: false,
  params: [
    {
      key: "recipient",
      label: "Recipient",
      type: "string",
      required: true,
      hint: "Phone number in E.164 format, or an email address when Type is Email.",
    },
    {
      key: "options",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Delivery channel, template, timeout, token shape",
      collapsed: true,
      children: [
        {
          key: "type",
          label: "Delivery channel",
          type: "select",
          default: "sms",
          options: [
            { value: "sms", label: "SMS" },
            { value: "flash", label: "Flash SMS" },
            { value: "tts", label: "Voice call (text-to-speech)" },
            { value: "email", label: "Email" },
          ],
        },
        {
          key: "originator",
          label: "Originator",
          type: "string",
          hint:
            "Sender phone number, alphanumeric string (max 11 chars), or — for Email — an address whose domain is set up as an email channel.",
        },
        {
          key: "reference",
          label: "Client reference",
          type: "string",
          hint: "Must be alphanumeric.",
        },
        {
          key: "template",
          label: "Message template",
          type: "string",
          placeholder: "Your code is: %token",
          hint: "Must contain %token.",
        },
        {
          key: "datacoding",
          label: "Data coding",
          type: "select",
          default: "plain",
          options: [
            { value: "plain", label: "Plain (GSM 03.38)" },
            { value: "unicode", label: "Unicode" },
            { value: "auto", label: "Auto" },
          ],
        },
        {
          key: "timeout",
          label: "Timeout (seconds)",
          type: "number",
          default: 30,
          hint: "How long the code stays valid. 30–172801 seconds (2 days).",
        },
        {
          key: "tokenLength",
          label: "Token length",
          type: "number",
          default: 6,
          hint: "6–10 characters.",
        },
        {
          key: "maxAttempts",
          label: "Max attempts",
          type: "number",
          default: 1,
          hint: "Attempts allowed before the Verify object is marked failed. 1–10.",
        },
        {
          key: "voice",
          label: "Voice (Voice call only)",
          type: "select",
          options: TTS_VOICE_OPTIONS,
        },
        {
          key: "language",
          label: "Language (Voice call only)",
          type: "select",
          options: TTS_LANGUAGE_OPTIONS,
        },
        {
          key: "subject",
          label: "Email subject (Email only)",
          type: "string",
          default: "Your OTP token",
        },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Verify ID" },
    { key: "recipient", type: "string", label: "Recipient" },
    { key: "status", type: "string", label: "Status" },
    { key: "validUntilDatetime", type: "string", label: "Valid until" },
  ],

  execute(input, ctx) {
    const client = new MessageBirdClient(ctx);
    return client.request(`/verify`, {
      method: "POST",
      body: {
        recipient: input.type === "email" ? input.recipient.trim() : toMsisdn(input.recipient),
        originator: input.originator,
        type: input.type,
        reference: input.reference,
        template: input.template,
        datacoding: input.datacoding,
        timeout: input.timeout,
        tokenLength: input.tokenLength,
        maxAttempts: input.maxAttempts,
        voice: input.voice,
        language: input.language,
        subject: input.subject,
      },
    });
  },
};

export default verifyRequest;
