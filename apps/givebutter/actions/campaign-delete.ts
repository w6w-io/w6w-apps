import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description:
    "Delete a campaign. Givebutter refuses this with a 409 if the campaign has already raised " +
    "money.",
  idempotent: true,
  params: [numericIdParam("Campaign")],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new GivebutterClient(ctx).status(
      `/campaigns/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default campaignDelete;
