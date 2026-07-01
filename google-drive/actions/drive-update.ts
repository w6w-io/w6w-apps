import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  driveId: string;
  name?: string;
  colorRgb?: string;
  useDomainAdminAccess?: boolean;
}

const updateDrive: ActionDefinition<Input> = {
  key: "drive-update",
  type: "perform",
  resource: "drive",
  title: "Update Shared Drive",
  description: "Update a shared drive's name or color.",
  params: [
    { key: "driveId", label: "Drive ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "colorRgb", label: "Color RGB", type: "string" },
    { key: "useDomainAdminAccess", label: "Use domain admin access", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.colorRgb !== undefined) body.colorRgb = input.colorRgb;
    return client.request(`/drives/${input.driveId}`, {
      method: "PATCH",
      body,
      query: { useDomainAdminAccess: input.useDomainAdminAccess },
    });
  },
};

export default updateDrive;
