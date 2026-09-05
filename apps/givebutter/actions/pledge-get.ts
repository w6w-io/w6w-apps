import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const pledgeGet: ActionDefinition<Input> = {
  key: "pledge-get",
  type: "read",
  resource: "pledge",
  title: "Get Pledge",
  description: "Fetch a single pledge by its numeric id.",
  params: [numericIdParam("Pledge")],
  output: [
    { key: "id", type: "string", label: "Pledge ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "amount_remaining", type: "string", label: "Amount remaining" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/pledges/${encodeURIComponent(input.id)}`);
  },
};

export default pledgeGet;
