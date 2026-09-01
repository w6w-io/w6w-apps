import type { ActionDefinition } from "@w6w/types";
import { compact, FreeAgentClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  to?: string;
  from?: string;
  subject?: string;
  body?: string;
  useTemplate?: boolean;
}

const invoiceSendEmail: ActionDefinition<Input> = {
  key: "invoice-send-email",
  type: "perform",
  resource: "invoice",
  title: "Send Invoice Email",
  description: "Email an invoice to its contact.",
  // Each call sends a new email; FreeAgent offers no request key to dedupe
  // on, so a retry sends the invoice twice.
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "useTemplate",
      label: "Use existing email template",
      type: "boolean",
      hint:
        "When enabled, `to`/`from`/`subject`/`body` are ignored in favour of the account's template.",
    },
    {
      key: "to",
      label: "To",
      type: "string",
      showIf: { "==": [{ var: "useTemplate" }, false] },
    },
    {
      key: "from",
      label: "From",
      type: "string",
      hint: 'Must belong to a registered user, e.g. "John Doe <john@example.com>".',
      showIf: { "==": [{ var: "useTemplate" }, false] },
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      showIf: { "==": [{ var: "useTemplate" }, false] },
    },
    {
      key: "body",
      label: "Body",
      type: "text",
      showIf: { "==": [{ var: "useTemplate" }, false] },
    },
  ],
  output: [],

  async execute(input, ctx) {
    const email = input.useTemplate
      ? { use_template: true }
      : compact({ to: input.to, from: input.from, subject: input.subject, body: input.body });
    await new FreeAgentClient(ctx).request(`/invoices/${input.invoiceId}/send_email`, {
      method: "POST",
      body: { invoice: { email } },
    });
    return {};
  },
};

export default invoiceSendEmail;
