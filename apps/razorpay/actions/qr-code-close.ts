import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { qrCodeIdParam } from "../lib/params.ts";

/**
 * `POST /v1/payments/qr_codes/{id}/close` — deactivate a QR code so it stops
 * accepting new payments. Once closed, it cannot be reopened.
 */
interface Input {
  id: string;
}

const qrCodeClose: ActionDefinition<Input> = {
  key: "qr-code-close",
  type: "perform",
  resource: "qr-code",
  title: "Close QR Code",
  description: "Deactivate a QR code. Once closed, it cannot be reopened.",
  idempotent: true,
  params: [qrCodeIdParam()],
  output: [
    { key: "id", type: "string", label: "QR Code ID" },
    { key: "status", type: "string", label: "Now 'closed' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      `/payments/qr_codes/${encodeURIComponent(input.id)}/close`,
    );
  },
};

export default qrCodeClose;
