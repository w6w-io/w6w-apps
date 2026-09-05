import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { commissionIdParam } from "../lib/params.ts";

/** `GET /commissions/{commission_id}/` */
interface Input {
  commissionId: number;
}

const commissionGet: ActionDefinition<Input> = {
  key: "commission-get",
  type: "read",
  resource: "commission",
  title: "Get Commission",
  description: "Fetch a single commission.",
  params: [commissionIdParam],
  output: [
    { key: "id", type: "number", label: "Commission id" },
    { key: "amount", type: "number", label: "Commission amount" },
    { key: "approved", type: "boolean", label: "Approval state (true/false/null = pending)" },
    { key: "affiliate", type: "object", label: "The commissioned affiliate" },
    { key: "conversion", type: "object", label: "The conversion this commission is tied to" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/commissions/${encodeId(input.commissionId)}/`);
  },
};

export default commissionGet;
