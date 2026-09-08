import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const toolGet: ActionDefinition<Input> = {
  key: "tool-get",
  type: "read",
  resource: "tool",
  title: "Get Tool",
  description: "Read one Tool's full configuration by id.",
  params: [idParam("Tool ID")],
  output: [
    { key: "id", type: "string", label: "Tool ID" },
    { key: "type", type: "string", label: "Tool type" },
  ],

  async execute(input, ctx) {
    const tool = await new VapiClient(ctx).json(`/tool/${encodeURIComponent(input.id)}`);
    return stripSecrets(tool);
  },
};

export default toolGet;
