import type { ActionDefinition } from "@w6w/types";
import { WiseClient } from "../lib/client.ts";
import { profileIdParam } from "../lib/params.ts";

/** `GET /profiles/{profileId}/balances/{balanceId}` — a single balance's details. */
interface Input {
  profileId: number;
  balanceId: number;
}

const balanceGet: ActionDefinition<Input> = {
  key: "balance-get",
  type: "read",
  resource: "balance",
  title: "Get Balance",
  description: "Get a single multi-currency balance by ID.",
  params: [
    profileIdParam,
    { key: "balanceId", label: "Balance ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Balance ID" },
    { key: "currency", type: "string", label: "Balance currency" },
    { key: "amount", type: "object", label: "Balance amount" },
  ],

  execute(input, ctx) {
    return new WiseClient(ctx).json(`/profiles/${input.profileId}/balances/${input.balanceId}`);
  },
};

export default balanceGet;
