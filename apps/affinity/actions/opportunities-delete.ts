import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { opportunityIdPathParam } from "../lib/params.ts";

/**
 * `DELETE /opportunities/{opportunity_id}`. Also deletes its field values.
 * Deleting an opportunity is equivalent to removing it from its list, since
 * an opportunity can only ever belong to one.
 */
interface Input {
  opportunityId: number;
}

const opportunitiesDelete: ActionDefinition<Input> = {
  key: "opportunities-delete",
  type: "perform",
  resource: "opportunity",
  title: "Delete Opportunity",
  description: "Delete an opportunity and its field values.",
  idempotent: true,
  params: [opportunityIdPathParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/opportunities/${input.opportunityId}`);
  },
};

export default opportunitiesDelete;
