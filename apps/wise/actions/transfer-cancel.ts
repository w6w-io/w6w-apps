import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";

/**
 * `PUT /transfers/{transferId}/cancel` — cancel a transfer that has not yet
 * been funded.
 *
 * Only works while the transfer is `incoming_payment_waiting`. Once it has
 * moved to `funds_converted`, or is held for compliance review, Wise answers
 * **409 Conflict** with the code `transfer.cancellation.not.allowed` — this
 * app's client surfaces that verbatim rather than as a generic failure.
 *
 * Marked idempotent: a `PUT` cancel does not change the end state on a
 * second call (the transfer stays cancelled, or the same 409 is repeated for
 * a transfer that has already moved on) — retrying never worsens anything.
 */
interface Input {
  transferId: number;
}

const transferCancel: ActionDefinition<Input> = {
  key: "transfer-cancel",
  type: "perform",
  resource: "transfer",
  title: "Cancel Transfer",
  description: "Cancel a transfer that is still waiting for its incoming payment.",
  idempotent: true,
  params: [
    { key: "transferId", label: "Transfer ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Transfer ID" },
    { key: "status", type: "string", label: "Transfer status after cancellation" },
  ],

  execute(input, ctx) {
    ctx.log("info", "cancelling Wise transfer", { transferId: input.transferId });
    return new WiseClient(ctx).json(`/transfers/${input.transferId}/cancel`, { method: "PUT" });
  },
};

export default transferCancel;
