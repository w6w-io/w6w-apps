import type { ActionDefinition } from "@w6w/types";
import { NotionClient } from "../lib/client.ts";

interface Input {
  blockId: string;
}

const getBlock: ActionDefinition<Input> = {
  key: "get-block",
  type: "read",
  resource: "block",
  title: "Get Block",
  description: "Retrieve a single block by ID.",
  params: [
    { key: "blockId", label: "Block ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/blocks/${input.blockId}`);
  },
};

export default getBlock;
