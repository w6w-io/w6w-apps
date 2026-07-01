import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  name: string;
}

const createList: ActionDefinition<Input, KlaviyoEnvelope> = {
  key: "create-list",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a new Klaviyo list.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope>(`/lists/`, {
      method: "POST",
      body: {
        data: {
          type: "list",
          attributes: { name: input.name },
        },
      },
    });
  },
};

export default createList;
