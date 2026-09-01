import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { disputeIdParam } from "../lib/params.ts";

/**
 * `PATCH /v1/disputes/{id}/contest` — submit evidence to challenge a
 * dispute.
 *
 * `action: "draft"` saves without submitting; `"submit"` sends it for bank
 * review and requires at least one evidence document ID. Evidence fields
 * take arrays of Document IDs — this app does not implement document
 * upload, so they are accepted as already-uploaded Document IDs (`doc_*`)
 * obtained elsewhere (e.g. the Dashboard).
 */
interface Input {
  id: string;
  action?: "draft" | "submit";
  amount?: number;
  summary?: string;
  shippingProof?: string[];
  billingProof?: string[];
  customerCommunication?: string[];
  proofOfService?: string[];
  explanationLetter?: string[];
}

const disputeContest: ActionDefinition<Input> = {
  key: "dispute-contest",
  type: "perform",
  resource: "dispute",
  title: "Contest Dispute",
  description:
    "Submit evidence to challenge a dispute. 'submit' requires at least one evidence document.",
  idempotent: true,
  params: [
    disputeIdParam(),
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "draft",
      options: [
        { value: "draft", label: "Save without submitting" },
        { value: "submit", label: "Submit for bank review" },
      ],
    },
    {
      key: "amount",
      label: "Contested amount",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Defaults to the full dispute amount. Smallest currency sub-unit.",
      advanced: true,
    },
    {
      key: "summary",
      label: "Explanation",
      type: "text",
      hint: "Why the dispute should be resolved in your favour. Max 1000 characters.",
    },
    {
      key: "shippingProof",
      label: "Shipping proof (document IDs)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    {
      key: "billingProof",
      label: "Billing proof (document IDs)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    {
      key: "customerCommunication",
      label: "Customer communication (document IDs)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    {
      key: "proofOfService",
      label: "Proof of service (document IDs)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
    {
      key: "explanationLetter",
      label: "Explanation letter (document IDs)",
      type: "array",
      item: { type: "string" },
      advanced: true,
    },
  ],
  output: [
    { key: "id", type: "string", label: "Dispute ID" },
    { key: "status", type: "string", label: "'under_review' once submitted" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).patch(
      `/disputes/${encodeURIComponent(input.id)}/contest`,
      compact({
        action: input.action,
        amount: input.amount,
        summary: input.summary,
        shipping_proof: input.shippingProof,
        billing_proof: input.billingProof,
        customer_communication: input.customerCommunication,
        proof_of_service: input.proofOfService,
        explanation_letter: input.explanationLetter,
      }),
    );
  },
};

export default disputeContest;
