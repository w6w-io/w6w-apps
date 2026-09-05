import type { ActionDefinition } from "@w6w/types";
import { call } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /deals.info` — verified against
 * `developer.focus.teamleader.eu/docs/api/deals-info` on 2026-09-01.
 */
interface Input {
  id: string;
}

const dealsInfo: ActionDefinition<Input> = {
  key: "deals-info",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Get details for a single deal.",
  params: [idParam("Deal ID", "f6871b06-6513-4750-b5e6-ff3503b5a029")],
  output: [{ key: "deal", type: "object", label: "Deal" }],

  async execute(input, ctx) {
    const deal = await call(ctx, "deals.info", { id: input.id });
    return { deal };
  },
};

export default dealsInfo;
