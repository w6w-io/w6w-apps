import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";
import { includeParam } from "../lib/params.ts";

/** `GET /v1/variants/:id`. */
interface Input {
  variantId: string;
  include?: string;
}

const variantGet: ActionDefinition<Input> = {
  key: "variant-get",
  type: "read",
  resource: "variant",
  title: "Get Variant",
  description: "Retrieve a single product variant by ID.",
  params: [
    { key: "variantId", label: "Variant ID", type: "string", required: true },
    includeParam,
  ],
  output: [{ key: "data", type: "object", label: "The Variant object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/variants/${encodeURIComponent(input.variantId)}`,
      { query: { include: input.include } },
    );
  },
};

export default variantGet;
