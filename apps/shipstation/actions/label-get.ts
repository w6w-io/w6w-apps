import type { ActionDefinition } from "@w6w/types";
import { ShipStationClient } from "../lib/client.ts";

/** `GET /v2/labels/{label_id}` — look up a purchased label. */
const action: ActionDefinition = {
  key: "label-get",
  type: "read",
  resource: "label",
  title: "Get a Label",
  description: "Look up a purchased label by its `label_id`.",
  params: [
    { key: "labelId", label: "Label ID", type: "string", required: true },
  ],
  output: [
    { key: "labelId", type: "string", label: "Label ID" },
    { key: "trackingNumber", type: "string", label: "Carrier tracking number" },
    { key: "labelDownload", type: "object", label: "{pdf, png, zpl, href} download URLs" },
    { key: "voided", type: "boolean", label: "Whether this label has been voided" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const labelId = typeof p.labelId === "string" ? p.labelId.trim() : "";
    if (!labelId) throw new Error("`labelId` is required");

    const label = await new ShipStationClient(ctx).request<Record<string, unknown>>(
      `/labels/${encodeURIComponent(labelId)}`,
    );
    return {
      ...label,
      labelId: label.label_id,
      trackingNumber: label.tracking_number,
      labelDownload: label.label_download,
      voided: label.voided ?? false,
    };
  },
};

export default action;
