import type { ActionDefinition, Param } from "@w6w/types";
import { compact, jsonArray, resourceUrl, SignRequestClient } from "../lib/client.ts";
import { documentIdParam, signrequestSummaryOutput } from "../lib/params.ts";

interface Input {
  documentId: string;
  signers: string;
  fromEmail?: string;
  fromEmailName?: string;
  subject?: string;
  message?: string;
  who?: string;
  sendReminders?: boolean;
  redirectUrl?: string;
  redirectUrlDeclined?: string;
  disableAttachments?: boolean;
  disableTextSignatures?: boolean;
  disableUploadSignatures?: boolean;
  disableText?: boolean;
  disableDate?: boolean;
  disableEmails?: boolean;
  requiredAttachments?: string;
}

const disableParams: Param[] = [
  { key: "disableAttachments", label: "Disable attachments", type: "boolean" },
  { key: "disableTextSignatures", label: "Disable typed (text) signatures", type: "boolean" },
  { key: "disableUploadSignatures", label: "Disable uploaded (image) signatures", type: "boolean" },
  { key: "disableText", label: "Disable adding text", type: "boolean" },
  { key: "disableDate", label: "Disable adding dates", type: "boolean" },
  {
    key: "disableEmails",
    label: "Disable all SignRequest emails",
    type: "boolean",
    hint: "Only takes effect when an Events Callback URL is set on the document — your " +
      "application is then expected to notify signers instead.",
  },
];

/**
 * `POST /signrequests/` — send a SignRequest for a document already created via
 * `document-create`. Use `signrequest-quick-create` to create the document and send the
 * SignRequest in one call instead.
 *
 * SignRequest always adds a signer for `fromEmail` too, with `needs_to_sign: false` — that signer
 * never receives a SignRequest email, only the final signed copy.
 */
const signrequestCreate: ActionDefinition<Input> = {
  key: "signrequest-create",
  type: "perform",
  resource: "signrequest",
  title: "Send SignRequest",
  description: "Send a document out for signature.",
  idempotent: false,
  params: [
    documentIdParam,
    {
      key: "signers",
      label: "Signers (JSON array)",
      type: "text",
      required: true,
      hint: 'e.g. `[{"email":"signer@example.com","first_name":"Jane"}]`. Only `email` is ' +
        "required per signer; see SignRequest's `Signer` object for the full set of optional " +
        "fields (`order`, `language`, `needs_to_sign`, `approve_only`, `notify_only`, " +
        "`in_person`, `redirect_url`, `after_document`, …).",
    },
    { key: "fromEmail", label: "From Email", type: "string", hint: "Must be a validated email." },
    { key: "fromEmailName", label: "From Name", type: "string" },
    { key: "subject", label: "Subject", type: "string" },
    { key: "message", label: "Message", type: "text" },
    {
      key: "who",
      label: "Who",
      type: "select",
      default: "o",
      options: [
        { value: "m", label: "Only me" },
        { value: "mo", label: "Me and others" },
        { value: "o", label: "Only others" },
      ],
    },
    { key: "sendReminders", label: "Send automatic reminders", type: "boolean" },
    { key: "redirectUrl", label: "Redirect URL (signed)", type: "string" },
    { key: "redirectUrlDeclined", label: "Redirect URL (declined)", type: "string" },
    ...disableParams,
    {
      key: "requiredAttachments",
      label: "Required Attachments (JSON array)",
      type: "text",
      hint: 'e.g. `[{"name":"Passport"}]` — attachments signers must upload before signing.',
    },
  ],
  output: signrequestSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/signrequests/", {
      method: "POST",
      body: compact({
        document: resourceUrl("documents", input.documentId),
        signers: jsonArray(input.signers, "signers"),
        from_email: input.fromEmail,
        from_email_name: input.fromEmailName,
        subject: input.subject,
        message: input.message,
        who: input.who,
        send_reminders: input.sendReminders,
        redirect_url: input.redirectUrl,
        redirect_url_declined: input.redirectUrlDeclined,
        disable_attachments: input.disableAttachments,
        disable_text_signatures: input.disableTextSignatures,
        disable_upload_signatures: input.disableUploadSignatures,
        disable_text: input.disableText,
        disable_date: input.disableDate,
        disable_emails: input.disableEmails,
        required_attachments: input.requiredAttachments
          ? jsonArray(input.requiredAttachments, "requiredAttachments")
          : undefined,
      }),
    });
  },
};

export default signrequestCreate;
