import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  emailRecipients?: unknown;
}

/**
 * Invoices are created in "Draft" status and are not recognized by
 * accounting reports (nor visible to the client) until marked or sent — see
 * the "Sending An Invoice" section of the Invoices reference. Marking as
 * sent (`action_mark_as_sent: true`) and emailing (`action_email: true` +
 * `email_recipients`) are the two documented ways; this action does the
 * former when no recipients are given, the latter when they are.
 */
const invoiceSend: ActionDefinition<Input> = {
  key: "invoice-send",
  type: "perform",
  resource: "invoice",
  title: "Send Invoice",
  description:
    "Mark a draft invoice as sent, or email it to a list of recipients. Draft invoices are not visible to the client or counted in reports until sent.",
  // Re-sending an already-sent invoice converges on the same "sent" state.
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "emailRecipients",
      label: "Email recipients",
      type: "json",
      advanced: true,
      hint:
        'JSON array of email addresses to send the invoice to, e.g. ["client@example.com"]. Leave empty to just mark the invoice as sent without emailing it.',
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    const recipients = Array.isArray(input.emailRecipients) ? input.emailRecipients : undefined;
    const body = recipients?.length
      ? { invoice: { action_email: true, email_recipients: recipients } }
      : { invoice: { action_mark_as_sent: true } };
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/invoices/invoices/${encodeURIComponent(input.invoiceId)}`,
      { method: "PUT", body },
    );
  },
};

export default invoiceSend;
