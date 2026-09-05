import type { ActionDefinition } from "@w6w/types";
import { ShippoClient } from "../lib/client.ts";

/**
 * `GET /transactions/{id}` — re-read a label purchase, most usefully to poll
 * one bought with `async: true` until its label and tracking number arrive.
 */
const action: ActionDefinition = {
  key: "transaction-get",
  type: "read",
  resource: "transaction",
  title: "Get a transaction",
  description: "Re-read a label purchase by id.",
  params: [
    { key: "transactionId", label: "Transaction ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "object_id", type: "string", label: "Transaction ID" },
    { key: "status", type: "string", label: "WAITING · QUEUED · SUCCESS · ERROR · REFUNDED" },
    { key: "tracking_number", type: "string", label: "The carrier's tracking number" },
    { key: "tracking_status", type: "string", label: "UNKNOWN · PRE_TRANSIT · TRANSIT · …" },
    { key: "label_url", type: "string", label: "The label file" },
  ],

  async execute(input, ctx) {
    const { transactionId } = input as { transactionId?: string };
    if (!transactionId) throw new Error("`transactionId` is required");

    const transaction = await new ShippoClient(ctx).request(
      `/transactions/${encodeURIComponent(transactionId)}`,
    ) as { object_id?: string; status?: string };

    ctx.log("info", "read a Shippo transaction", {
      transactionId: transaction?.object_id,
      status: transaction?.status,
    });
    return transaction;
  },
};

export default action;
