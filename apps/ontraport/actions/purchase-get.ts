import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /1/Purchase` — every field of one purchase. Read-only. */
interface Input {
  id: string;
}

const purchaseGet: ActionDefinition<Input> = {
  key: "purchase-get",
  type: "read",
  resource: "purchase",
  title: "Get Purchase",
  description: "Fetch all information for a single purchase by ID.",
  params: [idParam],
  output: [{ key: "data", type: "object", label: "The purchase" }],

  execute(input, ctx) {
    return new OntraportClient(ctx).data("/Purchase", { query: { id: input.id } });
  },
};

export default purchaseGet;
