import type { ActionDefinition } from "@w6w/types";
import { ShippoClient } from "../lib/client.ts";

/**
 * `GET /tracks/{carrier}/{tracking_number}` — read the current tracking
 * status for any carrier + tracking number, whether or not it was registered
 * through `track-create` or bought through `transaction-create`.
 *
 * `tracking_status.status` is one of `UNKNOWN`, `PRE_TRANSIT`, `TRANSIT`,
 * `DELIVERED`, `RETURNED`, `FAILURE` — an unscanned parcel reads as
 * `PRE_TRANSIT`/`UNKNOWN` rather than lost, and `RETURNED`/`FAILURE` are the
 * two statuses that actually need a human's attention.
 */
const action: ActionDefinition = {
  key: "track-get",
  type: "read",
  resource: "tracking",
  title: "Get tracking status",
  description: "Read the current tracking status for a carrier + tracking number.",
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
  ],
  output: [
    { key: "carrier", type: "string", label: "Carrier" },
    { key: "tracking_number", type: "string", label: "Tracking number" },
    { key: "tracking_status", type: "object", label: "Latest status" },
    { key: "tracking_history", type: "array", label: "Every tracking event, earliest first" },
    { key: "eta", type: "string", label: "Estimated time of arrival" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    if (!p.carrier) throw new Error("`carrier` is required");
    if (!p.trackingNumber) throw new Error("`trackingNumber` is required");

    const track = await new ShippoClient(ctx).request(
      `/tracks/${encodeURIComponent(String(p.carrier))}/${
        encodeURIComponent(String(p.trackingNumber))
      }`,
    ) as { carrier?: string; tracking_number?: string; tracking_status?: { status?: string } };

    ctx.log("info", "read a Shippo tracking status", {
      carrier: track?.carrier,
      status: track?.tracking_status?.status,
    });
    return track;
  },
};

export default action;
