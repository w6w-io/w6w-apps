import type { ActionDefinition } from "@w6w/types";
import { TwilioClient, escapeXml } from "../lib/client.ts";

interface Input {
  from: string;
  to: string;
  message: string;
  twiml?: boolean;
  statusCallback?: string;
}

/**
 * Place an outbound voice call via Twilio's `Calls` REST resource. When `twiml`
 * is false the plain-text `message` is wrapped in `<Response><Say>…</Say></Response>`;
 * when true the caller is expected to pass a full TwiML document, so it's sent
 * verbatim.
 */
const makeCall: ActionDefinition<Input> = {
  key: "make-call",
  type: "perform",
  resource: "call",
  title: "Make Call",
  description: "Place an outbound phone call with a spoken message or TwiML payload.",
  params: [
    {
      key: "from",
      label: "From",
      type: "string",
      required: true,
      hint: "Caller phone number in E.164 format, e.g. +14155238886.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Recipient phone number in E.164 format.",
    },
    { key: "message", label: "Message", type: "text", required: true },
    {
      key: "twiml",
      label: "Use TwiML",
      type: "boolean",
      default: false,
      hint: "When on, `message` must be a full TwiML document; otherwise it's spoken via `<Say>`.",
    },
    {
      key: "statusCallback",
      label: "Status Callback URL",
      type: "string",
      hint: "URL Twilio will POST call status updates to.",
    },
  ],

  async execute(input, ctx) {
    const client = new TwilioClient(ctx);
    const twiml = input.twiml
      ? input.message
      : `<Response><Say>${escapeXml(input.message)}</Say></Response>`;
    return client.request(client.accountPath("/Calls.json"), {
      method: "POST",
      form: {
        From: input.from,
        To: input.to,
        Twiml: twiml,
        StatusCallback: input.statusCallback,
      },
    });
  },
};

export default makeCall;
