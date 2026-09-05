import type { ActionDefinition } from "@w6w/types";
import { JudgeMeClient } from "../lib/client.ts";

/**
 * `POST /reviewers/data_request` — Data Request.
 *
 * A GDPR/CCPA-style "what data do you hold on this customer" request, keyed
 * by email and a list of the store platform's own order ids. The document
 * gives no request/response schema beyond a bare example — only the example
 * body shown in `components.examples`-adjacent inline `example:` block —
 * and no response schema at all (`{"description": "", "headers": {}}`), so
 * the raw response body is returned as-is.
 */
interface Input {
  email: string;
  orderExternalIds: string[];
}

const requestReviewerData: ActionDefinition<Input> = {
  key: "request-reviewer-data",
  type: "perform",
  resource: "reviewer",
  title: "Request Reviewer Data",
  description:
    "Submit a data request for a reviewer, identified by email and a list of the store " +
    "platform's own order ids. Response shape is undocumented by Judge.me.",
  idempotent: false,
  params: [
    { key: "email", label: "Customer Email", type: "string", required: true },
    {
      key: "orderExternalIds",
      label: "Order External IDs",
      type: "array",
      required: true,
      item: { type: "string" },
      hint: "The store platform's own order ids covered by this request.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Raw response body (shape undocumented by Judge.me)" },
  ],

  async execute(input, ctx) {
    const result = await new JudgeMeClient(ctx).json<Record<string, unknown>>(
      "/reviewers/data_request",
      {
        method: "POST",
        body: {
          customer: { email: input.email },
          orders_requested: input.orderExternalIds,
        },
      },
    );
    return { result };
  },
};

export default requestReviewerData;
