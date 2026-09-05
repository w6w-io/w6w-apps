import type { ActionDefinition } from "@w6w/types";
import { compact, TapfiliateClient } from "../lib/client.ts";

/** `GET /programs/{?asset_id}` */
interface Input {
  assetId?: string;
}

const programList: ActionDefinition<Input> = {
  key: "program-list",
  type: "search",
  resource: "program",
  title: "List Programs",
  description: "List all programs on the account, optionally filtered by asset id.",
  params: [{ key: "assetId", label: "Asset id", type: "string" }],
  output: [{ key: "items", type: "array", label: "Programs" }],

  async execute(input, ctx) {
    const { items } = await new TapfiliateClient(ctx).list("/programs/", {
      query: compact({ asset_id: input.assetId }),
    });
    return { items };
  },
};

export default programList;
