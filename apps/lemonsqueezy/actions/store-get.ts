import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/stores/:id` — a single store. */
interface Input {
  storeId: string;
  include?: string;
}

const storeGet: ActionDefinition<Input> = {
  key: "store-get",
  type: "read",
  resource: "store",
  title: "Get Store",
  description: "Retrieve a single store by ID.",
  params: [
    { key: "storeId", label: "Store ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Store object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(`/stores/${encodeURIComponent(input.storeId)}`, {
      query: { include: input.include },
    });
  },
};

export default storeGet;
