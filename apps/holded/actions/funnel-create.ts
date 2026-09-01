import type { ActionDefinition } from "@w6w/types";
import { HoldedClient } from "../lib/client.ts";

/**
 * `POST /funnels` — create a new sales funnel.
 *
 * The spec documents exactly one field, `name` (required); Holded assigns a
 * default set of stages to a new funnel, which Update Funnel can then
 * customise. Not idempotent — a retry creates a second funnel with the same
 * name, since Holded issues a fresh id on every call and the spec documents
 * no idempotency key.
 */
interface Input {
  name: string;
}

const funnelCreate: ActionDefinition<Input> = {
  key: "funnel-create",
  type: "perform",
  resource: "funnel",
  title: "Create Funnel",
  description: "Create a new sales funnel.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "1 on success" },
    { key: "info", type: "string", label: "Human status message" },
    { key: "id", type: "string", label: "New funnel ID" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).write("/funnels", "POST", { name: input.name });
  },
};

export default funnelCreate;
