import type { ActionDefinition } from "@w6w/types";
import { organizationIdFrom, ZohoInvoiceClient } from "../lib/client.ts";
import { organizationId, recordId, statusOutput } from "../lib/params.ts";

interface Input {
  recordId: string;
  toMailIds: string;
  ccMailIds?: string;
  subject?: string;
  body?: string;
  organizationId?: string;
}

function toList(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * `POST /invoices/{id}/email`. `to_mail_ids` is the vendor's one required
 * field; everything else — `subject`, `body`, `cc_mail_ids` — falls back to
 * Zoho's own default mail content when omitted, per the vendor doc's own
 * wording ("Input json string is not mandatory. If input json string is
 * empty, mail will be send with default mail content.").
 */
const invoiceEmail: ActionDefinition<Input> = {
  key: "invoice-email",
  type: "perform",
  resource: "invoice",
  title: "Email Invoice",
  description: "Email an invoice to the customer.",
  idempotent: false,
  params: [
    { ...recordId, hint: "The Zoho Invoice invoice id." },
    {
      key: "toMailIds",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated recipient email addresses.",
    },
    { key: "ccMailIds", label: "Cc", type: "string", hint: "Comma-separated email addresses." },
    { key: "subject", label: "Subject", type: "string" },
    { key: "body", label: "Body", type: "text" },
    organizationId,
  ],
  output: statusOutput,

  execute(input, ctx) {
    return new ZohoInvoiceClient(ctx).request(
      `/invoices/${encodeURIComponent(input.recordId)}/email`,
      {
        method: "POST",
        organizationId: organizationIdFrom(input, ctx),
        body: {
          to_mail_ids: toList(input.toMailIds),
          cc_mail_ids: toList(input.ccMailIds),
          subject: input.subject,
          body: input.body,
        },
      },
    );
  },
};

export default invoiceEmail;
