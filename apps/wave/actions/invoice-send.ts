import type { ActionDefinition } from "@w6w/types";
import { compact, csv, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  to: string;
  subject?: string;
  message?: string;
  attachPDF?: boolean;
  ccMyself?: boolean;
}

const MUTATION = `
  mutation SendInvoice($input: InvoiceSendInput!) {
    invoiceSend(input: $input) {
      didSucceed
      inputErrors { code message path }
    }
  }
`;

const invoiceSend: ActionDefinition<Input> = {
  key: "invoice-send",
  type: "perform",
  resource: "invoice",
  title: "Send Invoice",
  description: "Email an approved (saved) invoice to one or more recipients.",
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "One email, or comma-separated for several.",
    },
    { key: "subject", label: "Subject", type: "string" },
    { key: "message", label: "Message", type: "text" },
    { key: "attachPDF", label: "Attach PDF", type: "boolean", default: true },
    { key: "ccMyself", label: "CC myself", type: "boolean", advanced: true },
  ],
  output: [{ key: "didSucceed", type: "boolean", label: "Whether the send succeeded" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        invoiceId: input.invoiceId,
        to: csv(input.to),
        subject: input.subject,
        message: input.message,
        attachPDF: input.attachPDF ?? true,
        ccMyself: input.ccMyself,
      }),
    });

    return unwrap(data, "invoiceSend");
  },
};

export default invoiceSend;
