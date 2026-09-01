import type { ActionDefinition } from "@w6w/types";
import { compact, RazorpayClient } from "../lib/client.ts";
import { notesParam } from "../lib/params.ts";

/**
 * `POST /v1/payments/qr_codes` — create a UPI QR code for accepting digital
 * payments.
 *
 * On-demand feature requiring merchant activation. `single_use` requires
 * `fixedAmount: true` and a `closeBy` at most 45 days out; `multiple_use`
 * has no expiry restriction.
 */
interface Input {
  name: string;
  usage: "single_use" | "multiple_use";
  fixedAmount: boolean;
  paymentAmount?: number;
  description?: string;
  customerId?: string;
  closeBy?: number;
  notes?: unknown;
}

const qrCodeCreate: ActionDefinition<Input> = {
  key: "qr-code-create",
  type: "perform",
  resource: "qr-code",
  title: "Create QR Code",
  description:
    "Create a UPI QR code for accepting payments. On-demand feature requiring merchant " +
    "activation.",
  idempotent: false,
  params: [
    { key: "name", label: "Label", type: "string", required: true },
    {
      key: "usage",
      label: "Usage",
      type: "select",
      required: true,
      options: [
        { value: "single_use", label: "Single use — auto-closes after the first payment" },
        { value: "multiple_use", label: "Multiple use — stays open" },
      ],
    },
    {
      key: "fixedAmount",
      label: "Fixed amount",
      type: "boolean",
      required: true,
      hint:
        "Required (true) for single_use. If false, the customer enters the amount at scan time.",
    },
    {
      key: "paymentAmount",
      label: "Fixed payment amount",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Required when Fixed amount is on. Smallest currency sub-unit.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "customerId", label: "Customer ID", type: "string", advanced: true },
    {
      key: "closeBy",
      label: "Auto-close at (Unix timestamp)",
      type: "number",
      validation: { integer: true },
      hint: "For single_use, at most 45 days from creation.",
      advanced: true,
    },
    notesParam,
  ],
  output: [
    { key: "id", type: "string", label: "QR Code ID (qr_*)" },
    { key: "image_url", type: "string", label: "Hosted QR code image URL" },
    { key: "status", type: "string", label: "active | closed" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      "/payments/qr_codes",
      compact({
        type: "upi_qr",
        name: input.name,
        usage: input.usage,
        fixed_amount: input.fixedAmount,
        payment_amount: input.paymentAmount,
        description: input.description,
        customer_id: input.customerId,
        close_by: input.closeBy,
        notes: input.notes,
      }),
    );
  },
};

export default qrCodeCreate;
