import type { ActionDefinition } from "@w6w/types";
import { GoogleDriveClient } from "../lib/client.ts";

interface Input {
  name: string;
  colorRgb?: string;
  hidden?: boolean;
}

/**
 * Create a shared drive. Google requires a client-generated `requestId` for
 * idempotency — we generate a fresh UUID per invocation.
 */
const createDrive: ActionDefinition<Input> = {
  key: "drive-create",
  type: "perform",
  resource: "drive",
  title: "Create Shared Drive",
  description: "Create a new shared drive.",
  idempotent: true,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "colorRgb", label: "Color RGB", type: "string" },
    { key: "hidden", label: "Hidden", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const body: Record<string, unknown> = { name: input.name };
    if (input.colorRgb) body.colorRgb = input.colorRgb;
    if (input.hidden !== undefined) body.hidden = input.hidden;
    return client.request("/drives", {
      method: "POST",
      body,
      query: { requestId: crypto.randomUUID() },
    });
  },
};

export default createDrive;
