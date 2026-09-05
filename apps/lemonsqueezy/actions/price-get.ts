import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `GET /v1/prices/:id`. */
interface Input {
  priceId: string;
}

const priceGet: ActionDefinition<Input> = {
  key: "price-get",
  type: "read",
  resource: "price",
  title: "Get Price",
  description: "Retrieve a single price by ID.",
  params: [{ key: "priceId", label: "Price ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The Price object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(`/prices/${encodeURIComponent(input.priceId)}`);
  },
};

export default priceGet;
