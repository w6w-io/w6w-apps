import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { commissionIdParam } from "../lib/params.ts";

/** `DELETE /commissions/{commission_id}/approved/` */
interface Input {
  commissionId: number;
}

const commissionDisapprove: ActionDefinition<Input> = {
  key: "commission-disapprove",
  type: "perform",
  resource: "commission",
  title: "Disapprove Commission",
  description: "Disapprove a previously approved commission.",
  idempotent: true,
  params: [commissionIdParam],
  output: [
    { key: "id", type: "number", label: "Commission id" },
    { key: "approved", type: "boolean", label: "false" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/commissions/${encodeId(input.commissionId)}/approved/`,
      {
        method: "DELETE",
      },
    );
  },
};

export default commissionDisapprove;
