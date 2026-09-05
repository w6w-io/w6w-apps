import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const fundGet: ActionDefinition<Input> = {
  key: "fund-get",
  type: "read",
  resource: "fund",
  title: "Get Fund",
  description: "Fetch a single fund by id.",
  params: [idParam("Fund")],
  output: [
    { key: "id", type: "string", label: "Fund ID" },
    { key: "code", type: "string", label: "Fund code" },
    { key: "name", type: "string", label: "Name" },
    { key: "raised", type: "number", label: "Raised" },
    { key: "supporters", type: "number", label: "Supporters" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/funds/${encodeURIComponent(input.id)}`);
  },
};

export default fundGet;
