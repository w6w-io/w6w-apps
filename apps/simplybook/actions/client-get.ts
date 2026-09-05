import type { ActionDefinition } from "@w6w/types";
import { apiBaseOf, SimplybookClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `GET /admin/clients/{id}` — a single client by id. */
const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Get a client by id (GET /admin/clients/{id}).",
  params: [
    { key: "id", label: "Client ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new SimplybookClient(ctx, apiBaseOf(ctx.connection));
    return client.request(`/admin/clients/${encodeURIComponent(input.id)}`);
  },
};

export default clientGet;
