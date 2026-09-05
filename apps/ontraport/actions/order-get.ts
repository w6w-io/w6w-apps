import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Order` — every field of one order. */
interface Input {
  id: string;
}

const orderGet: ActionDefinition<Input> = {
  key: "order-get",
  type: "read",
  resource: "order",
  title: "Get Order",
  description: "Fetch all information for a single order by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The order" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Order", { query: { id: input.id } });
  },
};

export default orderGet;
