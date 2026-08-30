import type { ActionDefinition } from "@w6w/types";
import { compact, csv, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  estimateId: string;
  to: string;
  subject?: string;
  message?: string;
  attachPDF?: boolean;
  ccMyself?: boolean;
}

const MUTATION = `
  mutation SendEstimate($input: EstimateSendInput!) {
    estimateSend(input: $input) {
      didSucceed
      inputErrors { code message path }
    }
  }
`;

const estimateSend: ActionDefinition<Input> = {
  key: "estimate-send",
  type: "perform",
  resource: "estimate",
  title: "Send Estimate",
  description: "Email an estimate to one or more recipients.",
  idempotent: false,
  params: [
    { key: "estimateId", label: "Estimate ID", type: "string", required: true },
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
        estimateId: input.estimateId,
        to: csv(input.to),
        subject: input.subject,
        message: input.message,
        attachPDF: input.attachPDF ?? true,
        ccMyself: input.ccMyself,
      }),
    });

    return unwrap(data, "estimateSend");
  },
};

export default estimateSend;
