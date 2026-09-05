import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/** `DELETE /affiliates/{affiliate_id}/group/` */
interface Input {
  affiliateId: string;
}

const affiliateGroupRemove: ActionDefinition<Input> = {
  key: "affiliate-group-remove",
  type: "perform",
  resource: "affiliate",
  title: "Remove Affiliate Group",
  description: "Remove an affiliate from its affiliate group.",
  idempotent: true,
  params: [affiliateIdParam],
  output: [
    { key: "id", type: "string", label: "Affiliate id" },
    { key: "affiliate_group_id", type: "string", label: "null after removal" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/group/`,
      {
        method: "DELETE",
      },
    );
  },
};

export default affiliateGroupRemove;
