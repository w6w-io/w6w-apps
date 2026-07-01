import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  driveId: string;
  useDomainAdminAccess?: boolean;
}

const getDrive: ActionDefinition<Input> = {
  key: "drive-get",
  type: "read",
  resource: "drive",
  title: "Get Shared Drive",
  description: "Retrieve a shared drive by ID.",
  params: [
    { key: "driveId", label: "Drive ID", type: "string", required: true },
    { key: "useDomainAdminAccess", label: "Use domain admin access", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    return client.request(`/drives/${input.driveId}`, {
      query: { useDomainAdminAccess: input.useDomainAdminAccess },
    });
  },
};

export default getDrive;
