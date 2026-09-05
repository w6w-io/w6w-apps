import type { ActionDefinition } from "@w6w/types";
import { ShippoClient } from "../lib/client.ts";

/**
 * `POST /refunds` — ask the carrier for money back on an unused label.
 *
 * This is a **request**, not a guarantee: Shippo's own `status` values are
 * `QUEUED` → `PENDING` → `SUCCESS`/`ERROR`, and most carriers only honor a
 * refund for a label that was never scanned into their network. Poll
 * `transaction-get` (its `status` moves to `REFUNDED`) to see the outcome.
 */
const action: ActionDefinition = {
  key: "refund-create",
  type: "perform",
  resource: "refund",
  title: "Refund a label",
  description:
    "Request a refund for an unused label. Not guaranteed or instant — check transaction-get " +
    "afterwards for the outcome.",
  idempotent: false,
  params: [
    {
      key: "transactionId",
      label: "Transaction ID",
      type: "string",
      required: true,
      default: "",
      hint: "The transaction (label) to refund.",
    },
  ],
  output: [
    { key: "object_id", type: "string", label: "Refund ID" },
    { key: "status", type: "string", label: "QUEUED · PENDING · SUCCESS · ERROR" },
    { key: "transaction", type: "string", label: "The transaction ID this refunds" },
  ],

  async execute(input, ctx) {
    const { transactionId } = input as { transactionId?: string };
    if (!transactionId) throw new Error("`transactionId` is required");

    const refund = await new ShippoClient(ctx).request("/refunds", {
      method: "POST",
      body: { transaction: transactionId },
    }) as { object_id?: string; status?: string };

    ctx.log("info", "requested a Shippo refund", {
      refundId: refund?.object_id,
      status: refund?.status,
    });
    return refund;
  },
};

export default action;
