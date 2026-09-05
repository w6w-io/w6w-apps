import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const payoutGet: ActionDefinition<Input> = {
  key: "payout-get",
  type: "read",
  resource: "payout",
  title: "Get Payout",
  description: "Fetch a single payout by its payout number.",
  params: [idParam("Payout", "The payout's number, from a prior list call.")],
  output: [
    { key: "id", type: "string", label: "Payout number" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "payout", type: "number", label: "Net payout" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/payouts/${encodeURIComponent(input.id)}`);
  },
};

export default payoutGet;
