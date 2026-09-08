import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const squadGet: ActionDefinition<Input> = {
  key: "squad-get",
  type: "read",
  resource: "squad",
  title: "Get Squad",
  description: "Read one Squad's member Assistants and hand-off configuration by id.",
  params: [idParam("Squad ID")],
  output: [
    { key: "id", type: "string", label: "Squad ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "members", type: "array", label: "Members" },
  ],

  async execute(input, ctx) {
    const squad = await new VapiClient(ctx).json(`/squad/${encodeURIComponent(input.id)}`);
    return stripSecrets(squad);
  },
};

export default squadGet;
