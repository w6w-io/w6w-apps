import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/** `DELETE /affiliates/{affiliate_id}/` */
interface Input {
  affiliateId: string;
}

const affiliateDelete: ActionDefinition<Input> = {
  key: "affiliate-delete",
  type: "perform",
  resource: "affiliate",
  title: "Delete Affiliate",
  description: "Permanently delete an affiliate.",
  idempotent: true,
  params: [affiliateIdParam],
  output: [{
    key: "result",
    type: "object",
    label: "Deleted affiliate, if the vendor returns a body",
  }],

  async execute(input, ctx) {
    const result = await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/`,
      {
        method: "DELETE",
      },
    );
    return { result: result ?? null };
  },
};

export default affiliateDelete;
