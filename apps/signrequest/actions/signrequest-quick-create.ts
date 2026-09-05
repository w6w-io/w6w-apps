import type { ActionDefinition, Param } from "@w6w/types";
import { compact, jsonArray, resourceUrl, SignRequestClient } from "../lib/client.ts";
import { signrequestSummaryOutput } from "../lib/params.ts";

interface Input {
  signers: string;
  name?: string;
  externalId?: string;
  templateId?: string;
  fileFromUrl?: string;
  fileFromContent?: string;
  fileFromContentName?: string;
  fromEmail?: string;
  fromEmailName?: string;
  subject?: string;
  message?: string;
  who?: string;
  sendReminders?: boolean;
  redirectUrl?: string;
  redirectUrlDeclined?: string;
  disableEmails?: boolean;
}

const disableEmailsParam: Param = {
  key: "disableEmails",
  label: "Disable all SignRequest emails",
  type: "boolean",
  hint: "Only takes effect when an Events Callback URL is set — your application is then " +
    "expected to notify signers instead.",
};

/**
 * `POST /signrequest-quick-create/` — create a document AND send the SignRequest in one call,
 * taking the combined fields of `document-create` and `signrequest-create`.
 *
 * Same content rule as `document-create`: give exactly one of `templateId`, `fileFromUrl`, or
 * `fileFromContent` (+ `fileFromContentName`).
 */
const signrequestQuickCreate: ActionDefinition<Input> = {
  key: "signrequest-quick-create",
  type: "perform",
  resource: "signrequest",
  title: "Quick Create SignRequest",
  description:
    "Create a document and send a SignRequest for it in one call. Exactly one of Template ID / " +
    "File from URL / File from Content should be given.",
  idempotent: false,
  params: [
    {
      key: "signers",
      label: "Signers (JSON array)",
      type: "text",
      required: true,
      hint: 'e.g. `[{"email":"signer@example.com","first_name":"Jane"}]`. Only `email` is ' +
        "required per signer.",
    },
    { key: "name", label: "Name", type: "string", hint: "Defaults to the filename, if known." },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "templateId", label: "Template ID", type: "string" },
    { key: "fileFromUrl", label: "File from URL", type: "string" },
    { key: "fileFromContent", label: "File from Content (base64)", type: "text" },
    { key: "fileFromContentName", label: "File from Content — filename", type: "string" },
    { key: "fromEmail", label: "From Email", type: "string" },
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
    disableEmailsParam,
  ],
  output: signrequestSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/signrequest-quick-create/", {
      method: "POST",
      body: compact({
        signers: jsonArray(input.signers, "signers"),
        name: input.name,
        external_id: input.externalId,
        template: input.templateId ? resourceUrl("templates", input.templateId) : undefined,
        file_from_url: input.fileFromUrl,
        file_from_content: input.fileFromContent,
        file_from_content_name: input.fileFromContentName,
        from_email: input.fromEmail,
        from_email_name: input.fromEmailName,
        subject: input.subject,
        message: input.message,
        who: input.who,
        send_reminders: input.sendReminders,
        redirect_url: input.redirectUrl,
        redirect_url_declined: input.redirectUrlDeclined,
        disable_emails: input.disableEmails,
      }),
    });
  },
};

export default signrequestQuickCreate;
