import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { affiliateIdParam } from "../lib/params.ts";

/**
 * `PUT /affiliates/{affiliate_id}/group/`
 *
 * The request body field, `group_id`, is undocumented in this endpoint's
 * prose "Arguments" section — that section is entirely absent for this
 * endpoint. It only appears in the page's Node.js code sample:
 * `body: {group_id: '<ADD STRING VALUE>'}`. Missing this would have produced
 * an action that silently did nothing (a PUT with an empty body), since
 * there is no other clue in the rendered reference that a body is expected
 * at all.
 */
interface Input {
  affiliateId: string;
  affiliateGroupId: string;
}

const affiliateGroupSet: ActionDefinition<Input> = {
  key: "affiliate-group-set",
  type: "perform",
  resource: "affiliate",
  title: "Set Affiliate Group",
  description: "Assign an affiliate to an affiliate group.",
  idempotent: true,
  params: [
    affiliateIdParam,
    { key: "affiliateGroupId", label: "Affiliate group", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Affiliate id" },
    { key: "affiliate_group_id", type: "string", label: "Group id, updated" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/affiliates/${encodeId(input.affiliateId)}/group/`,
      {
        method: "PUT",
        body: { group_id: input.affiliateGroupId },
      },
    );
  },
};

export default affiliateGroupSet;
