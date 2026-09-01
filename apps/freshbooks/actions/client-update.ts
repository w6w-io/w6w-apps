import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";

interface Input {
  clientId: string;
  fields: unknown;
}

const clientUpdate: ActionDefinition<Input> = {
  key: "client-update",
  type: "perform",
  resource: "client",
  title: "Update Client",
  description: "Update an existing client's fields.",
  // PUTting the same field set twice converges on the same record.
  idempotent: true,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of FreshBooks client field names -> values, e.g. { "organization": "Acme" }.',
    },
  ],
  output: [{ key: "client", type: "object", label: "Client" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/users/clients/${encodeURIComponent(input.clientId)}`,
      { method: "PUT", body: { client: jsonObject(input.fields, "fields") } },
    );
  },
};

export default clientUpdate;
