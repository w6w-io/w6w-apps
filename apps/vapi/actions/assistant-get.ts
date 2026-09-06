import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const assistantGet: ActionDefinition<Input> = {
  key: "assistant-get",
  type: "read",
  resource: "assistant",
  title: "Get Assistant",
  description: "Read one Assistant's full configuration by id.",
  params: [idParam("Assistant ID")],
  output: [
    { key: "id", type: "string", label: "Assistant ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const assistant = await new VapiClient(ctx).json(`/assistant/${encodeURIComponent(input.id)}`);
    return stripSecrets(assistant);
  },
};

export default assistantGet;
