import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";

/** `DELETE /affiliate-prospects/{affiliate_prospect_id}/` */
interface Input {
  affiliateProspectId: string;
}

const affiliateProspectDelete: ActionDefinition<Input> = {
  key: "affiliate-prospect-delete",
  type: "perform",
  resource: "affiliate-prospect",
  title: "Delete Affiliate Prospect",
  description: "Permanently delete an affiliate prospect.",
  idempotent: true,
  params: [{
    key: "affiliateProspectId",
    label: "Affiliate prospect",
    type: "string",
    required: true,
  }],
  output: [{
    key: "result",
    type: "object",
    label: "Deleted prospect, if the vendor returns a body",
  }],

  async execute(input, ctx) {
    const result = await new TapfiliateClient(ctx).json(
      `/affiliate-prospects/${encodeId(input.affiliateProspectId)}/`,
      { method: "DELETE" },
    );
    return { result: result ?? null };
  },
};

export default affiliateProspectDelete;
