import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** GET /v2/people/:id — fetch a single person by id. */
const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Fetch a person by ID.",
  params: [
    { key: "id", label: "Person ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Person" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/people/${input.id}`);
  },
};

export default personGet;
