import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, TapfiliateClient } from "../lib/client.ts";
import { commissionIdParam } from "../lib/params.ts";

/** `PATCH /commissions/{commission_id}/` */
interface Input {
  commissionId: number;
  amount?: number;
  comment?: string;
  approved?: boolean;
  conversionSubAmount?: number;
}

const commissionUpdate: ActionDefinition<Input> = {
  key: "commission-update",
  type: "perform",
  resource: "commission",
  title: "Update Commission",
  description:
    "Update a commission's amount, comment, approval, or its conversion's sub-amount (recalculates it).",
  idempotent: true,
  params: [
    commissionIdParam,
    { key: "amount", label: "New amount", type: "number" },
    { key: "comment", label: "Comment", type: "text", hint: "Visible to the affiliate." },
    { key: "approved", label: "Approved", type: "boolean" },
    {
      key: "conversionSubAmount",
      label: "New conversion sub-amount",
      type: "number",
      hint: "Recalculates the commission and its conversion.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Commission id" },
    { key: "amount", type: "number", label: "Amount, updated" },
    { key: "approved", type: "boolean", label: "Approval state, updated" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/commissions/${encodeId(input.commissionId)}/`, {
      method: "PATCH",
      body: compact({
        amount: input.amount,
        comment: input.comment,
        approved: input.approved,
        conversion_sub_amount: input.conversionSubAmount,
      }),
    });
  },
};

export default commissionUpdate;
