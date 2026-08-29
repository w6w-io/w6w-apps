import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** GET /v2/users/:id — fetch a single Salesloft team member by id. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a Salesloft team member by ID.",
  params: [
    { key: "id", label: "User ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "User" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/users/${input.id}`);
  },
};

export default userGet;
