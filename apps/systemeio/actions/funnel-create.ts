import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  name: string;
}

/**
 * `POST /api/funnels`. This app does not manage funnel steps (`/api/funnels/
 * {funnelId}/steps`, `/api/funnel-steps/{id}`) — a funnel is created empty and
 * its steps (pages) are built in the systeme.io page editor, which is out of
 * scope for a workflow action. See the README's "Not implemented" section.
 */
const funnelCreate: ActionDefinition<Input> = {
  key: "funnel-create",
  type: "perform",
  resource: "funnel",
  title: "Create Funnel",
  description: "Create an empty Funnel resource. Steps are added in the systeme.io page editor.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Funnel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "isActive", type: "boolean", label: "Active" },
  ],

  async execute(input, ctx) {
    return await new SystemeClient(ctx).post("/api/funnels", { name: input.name });
  },
};

export default funnelCreate;
