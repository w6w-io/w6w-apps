import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** GET /v2/accounts/:id — fetch a single account by id. */
const accountGet: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch an account by ID.",
  params: [
    { key: "id", label: "Account ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/accounts/${input.id}`);
  },
};

export default accountGet;
