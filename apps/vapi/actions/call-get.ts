import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Read one call's full record — status, transcript, analysis, cost — by id.",
  params: [idParam("Call ID")],
  output: [
    { key: "id", type: "string", label: "Call ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "endedReason", type: "string", label: "Ended reason" },
    { key: "cost", type: "number", label: "Cost (USD)" },
  ],

  async execute(input, ctx) {
    const call = await new VapiClient(ctx).json(`/call/${encodeURIComponent(input.id)}`);
    return stripSecrets(call);
  },
};

export default callGet;
