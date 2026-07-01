import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  driveId: string;
}

const deleteDrive: ActionDefinition<Input> = {
  key: "drive-delete",
  type: "perform",
  resource: "drive",
  title: "Delete Shared Drive",
  description: "Permanently delete a shared drive. The drive must be empty.",
  params: [
    { key: "driveId", label: "Drive ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    await client.request(`/drives/${input.driveId}`, { method: "DELETE" });
    return { id: input.driveId, success: true };
  },
};

export default deleteDrive;
