import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { qrCodeIdParam } from "../lib/params.ts";

/** `GET /v1/payments/qr_codes/{id}` — a QR code's details, including payment counts and status. */
interface Input {
  id: string;
}

const qrCodeGet: ActionDefinition<Input> = {
  key: "qr-code-get",
  type: "read",
  resource: "qr-code",
  title: "Get QR Code",
  description: "Fetch a QR code's details, including payment counts and current status.",
  params: [qrCodeIdParam()],
  output: [
    { key: "id", type: "string", label: "QR Code ID" },
    { key: "image_url", type: "string", label: "Hosted QR code image URL" },
    { key: "status", type: "string", label: "active | closed" },
    { key: "payments_amount_received", type: "number", label: "Total received (sub-unit)" },
    { key: "payments_count_received", type: "number", label: "Number of payments received" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).get(`/payments/qr_codes/${encodeURIComponent(input.id)}`);
  },
};

export default qrCodeGet;
