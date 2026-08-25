import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v2/contacts/count`. Safe to invoke with no params — see `index.ts`. */
const contactCount: ActionDefinition<Input> = {
  key: "contact-count",
  type: "read",
  resource: "contact",
  title: "Get Contact Count",
  description: "Get the total number of contacts on this account.",
  params: [],
  output: [{ key: "count", type: "number", label: "Total contacts" }],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/v2/contacts/count");
  },
};

export default contactCount;
