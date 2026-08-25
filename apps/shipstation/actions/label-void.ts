import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/**
 * `PUT /v2/labels/{label_id}/void` — void a purchased label and (carrier permitting)
 * get a refund. **Cannot be undone** — a new label must be purchased if you still
 * need to ship. Voiding an already-voided label is rejected, but that failure leaves
 * the label in the same voided state either way, so this is safe to retry.
 */
const action: ActionDefinition = {
  key: "label-void",
  type: "perform",
  resource: "label",
  title: "Void a Label",
  description: "Void a purchased label. Cannot be undone — a new label must be purchased " +
    "afterward if the shipment still needs to go out.",
  idempotent: true,
  params: [
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],
  output: [
    { key: "approved", type: "boolean", label: "Whether the void/refund request was approved" },
    { key: "message", type: "string", label: "Carrier-specific message about the void" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const labelId = typeof p.labelId === "string" ? p.labelId.trim() : "";
    if (!labelId) throw new Error("`labelId` is required");

    const result = await new ShipStationClient(ctx).request<
      { approved?: boolean; message?: string }
    >(
      `/labels/${encodeURIComponent(labelId)}/void`,
      { method: "PUT" },
    );
    ctx.log("info", "voided a ShipStation label", { labelId, approved: result?.approved });
    return { approved: result?.approved ?? false, message: result?.message };
  },
};

export default action;
