import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient } from "../lib/client.ts";

interface Input {
  clientId: string;
}

const clientGet: ActionDefinition<Input> = {
  key: "client-get",
  type: "read",
  resource: "client",
  title: "Get Client",
  description: "Get a single client by id.",
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
  ],
  output: [{ key: "client", type: "object", label: "Client" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/users/clients/${encodeURIComponent(input.clientId)}`,
    );
  },
};

export default clientGet;
