import type { ActionDefinition } from "@w6w/types";
import { PaddleClient } from "../lib/client.ts";

/** `GET /prices/{price_id}` — one price, optionally with its product. */
interface Input {
  priceId: string;
  includeProduct?: boolean;
}

const priceGet: ActionDefinition<Input> = {
  key: "price-get",
  type: "read",
  resource: "price",
  title: "Get Price",
  description: "Fetch a single price by its Paddle ID.",
  params: [
    {
      key: "priceId",
      label: "Price ID",
      type: "string",
      required: true,
      placeholder: "pri_01gsz8x8sawmvhz1pv30nge1ke",
      validation: { pattern: "^pri_[a-z0-9]{26}$" },
    },
    { key: "includeProduct", label: "Include product", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "Price" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(`/prices/${encodeURIComponent(input.priceId)}`, {
      query: { include: input.includeProduct ? "product" : undefined },
    });
  },
};

export default priceGet;
