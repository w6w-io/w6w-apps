import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { clientOutput } from "../lib/params.ts";

interface Input {
  clientId: string;
}

/** `GET /api/v1/clients/{id}` — verified against `showClient` in the OpenAPI document. */
const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Retrieve a single client by hashed ID.",
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
  ],
  output: clientOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/clients/${input.clientId}`);
  },
};

export default clientGet;
