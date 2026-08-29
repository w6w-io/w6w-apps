import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `DELETE /v2/devices/{iden}`. */
interface Input {
  iden: string;
}

const deviceDelete: ActionDefinition<Input> = {
  key: "device-delete",
  type: "perform",
  resource: "device",
  title: "Delete Device",
  description: "Delete a device.",
  idempotent: true,
  params: [{ key: "iden", label: "Device ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new PushbulletClient(ctx).status(
      `/devices/${encodeURIComponent(input.iden)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 200 };
  },
};

export default deviceDelete;
