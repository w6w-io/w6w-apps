import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { commissionIdParam } from "../lib/params.ts";

/** `PUT /commissions/{commission_id}/approved/` */
interface Input {
  commissionId: number;
}

const commissionApprove: ActionDefinition<Input> = {
  key: "commission-approve",
  type: "perform",
  resource: "commission",
  title: "Approve Commission",
  description: "Approve a commission.",
  idempotent: true,
  params: [commissionIdParam],
  output: [
    { key: "id", type: "number", label: "Commission id" },
    { key: "approved", type: "boolean", label: "true" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(
      `/commissions/${encodeId(input.commissionId)}/approved/`,
      {
        method: "PUT",
      },
    );
  },
};

export default commissionApprove;
