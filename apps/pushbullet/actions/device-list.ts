import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `GET /v2/devices`. The endpoint's own doc says "Request: none", but the
 * vendor's general Objects section states every list-* call accepts
 * `active`/`limit`/`cursor`/`modified_after`, so they are offered here too.
 */
interface Input {
  modifiedAfter?: number;
  active?: boolean;
  cursor?: string;
  limit?: number;
}

interface DeviceListResponse {
  devices?: unknown[];
  cursor?: string;
}

const deviceList: ActionDefinition<Input> = {
  key: "device-list",
  type: "read",
  resource: "device",
  title: "List Devices",
  description: "List devices belonging to the current user, most recently modified first.",
  params: [
    { key: "modifiedAfter", label: "Modified after", type: "number", advanced: true },
    { key: "active", label: "Active only", type: "boolean" },
    { key: "cursor", label: "Cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 50, validation: { min: 1, max: 500 } },
  ],
  output: [
    { key: "devices", type: "array", label: "Devices" },
    { key: "cursor", type: "string", label: "Cursor for the next page, if any" },
  ],

  async execute(input, ctx) {
    const body = await new PushbulletClient(ctx).json<DeviceListResponse>("/devices", {
      query: compact({
        modified_after: input.modifiedAfter,
        active: input.active,
        cursor: input.cursor,
        limit: input.limit,
      }),
    });
    return { devices: body.devices ?? [], cursor: body.cursor };
  },
};

export default deviceList;
