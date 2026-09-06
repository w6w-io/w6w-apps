import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

interface Input {
  planningId: string;
  include?: string;
}

/** `GET /plannings/{id}` — verified against developers.booqable.com ("Fetch a planning"). */
const planningGet: ActionDefinition<Input> = {
  key: "planning-get",
  type: "read",
  resource: "planning",
  title: "Get Planning",
  description: "Fetch a single planning by id.",
  params: [
    { key: "planningId", label: "Planning ID", type: "string", required: true },
    { ...includeParam, placeholder: "order,item,downtime" },
  ],
  output: [{ key: "data", type: "object", label: "The Planning object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/plannings/${input.planningId}`, {
      query: { include: input.include },
    });
  },
};

export default planningGet;
