import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import { envelopeOutput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  constituent_id: number;
  limit?: number;
  offset?: number;
}

/** `GET /api/v1/constituents/{constituent_id}/gifts.json`. */
const giftList: ActionDefinition<Input> = {
  key: "gift-list",
  type: "read",
  resource: "gift",
  title: "List Gifts for Constituent",
  description: "List gifts recorded against a single constituent.",
  params: [
    {
      key: "constituent_id",
      label: "Constituent ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    ...paginationParams(),
  ],
  output: envelopeOutput,

  async execute(input, ctx) {
    return await new LglClient(ctx).list(`/constituents/${input.constituent_id}/gifts`, {
      query: paginationQuery(input),
    });
  },
};

export default giftList;
