import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `GET /v2/clients/{client_id}` — one client.
 *
 * Returns `{"client": {...Client}}`, the same schema `client-list` returns.
 * `project_ids` is the client's projects, which is how a workflow goes from an
 * invoice-relevant client to the work billed against it.
 */
interface Input {
  client_id: number;
}

const action: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Get one client by ID (GET /v2/clients/{client_id}).",
  params: [clientIdParam],
  output: [{ key: "client", type: "object", label: "Client" }],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request(`/clients/${input.client_id}`);
  },
};

export default action;
