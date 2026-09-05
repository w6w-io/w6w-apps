import type { ActionDefinition } from "@w6w/types";
import { compact, ShippoClient } from "../lib/client.ts";

/**
 * `POST /tracks` — register a carrier + tracking number for status updates,
 * for a package **not necessarily bought through Shippo** (e.g. a label
 * purchased elsewhere, or by a customer's own carrier account). Also returns
 * the tracking status known so far in the same response.
 *
 * A transaction bought via `transaction-create` is already tracked — use
 * `track-get` to read its status instead of registering it again here.
 */
const action: ActionDefinition = {
  key: "track-create",
  type: "perform",
  resource: "tracking",
  title: "Register a tracking number",
  description:
    "Start tracking a carrier + tracking number pair not already tracked through a Shippo " +
    "transaction, and return whatever status is known so far.",
  idempotent: false,
  params: [
    {
      key: "carrier",
      label: "Carrier",
      type: "string",
      required: true,
      default: "",
      hint: 'Shippo\'s carrier token, e.g. "usps", "ups", "fedex", "dhl_express".',
    },
    {
      key: "trackingNumber",
      label: "Tracking Number",
      type: "string",
      required: true,
      default: "",
    },
    { key: "metadata", label: "Metadata", type: "string", default: "" },
  ],
  output: [
    { key: "carrier", type: "string", label: "Carrier" },
    { key: "tracking_number", type: "string", label: "Tracking number" },
    { key: "tracking_status", type: "object", label: "Latest status" },
    { key: "eta", type: "string", label: "Estimated time of arrival" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.carrier) throw new Error("`carrier` is required");
    if (!p.trackingNumber) throw new Error("`trackingNumber` is required");

    const track = await new ShippoClient(ctx).request("/tracks", {
      method: "POST",
      body: compact({
        carrier: p.carrier,
        tracking_number: p.trackingNumber,
        metadata: p.metadata,
      }),
    }) as { carrier?: string; tracking_number?: string; tracking_status?: { status?: string } };

    ctx.log("info", "registered a Shippo tracking number", {
      carrier: track?.carrier,
      status: track?.tracking_status?.status,
    });
    return track;
  },
};

export default action;
