import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** GET /v2/cadences/:id — fetch a single cadence by id. */
const cadenceGet: ActionDefinition<Input> = {
  key: "cadence-get",
  type: "read",
  resource: "cadence",
  title: "Get Cadence",
  description: "Fetch a cadence by ID.",
  params: [
    { key: "id", label: "Cadence ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Cadence" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/cadences/${input.id}`);
  },
};

export default cadenceGet;
