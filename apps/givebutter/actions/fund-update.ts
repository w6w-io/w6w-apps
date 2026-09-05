import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  code?: string;
}

const fundUpdate: ActionDefinition<Input> = {
  key: "fund-update",
  type: "perform",
  resource: "fund",
  title: "Update Fund",
  description: "Update a fund's name or code.",
  idempotent: true,
  params: [
    idParam("Fund"),
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "code", label: "Code", type: "string", validation: { maxLength: 255 } },
  ],
  output: [
    { key: "id", type: "string", label: "Fund ID" },
    { key: "code", type: "string", label: "Fund code" },
  ],

  async execute(input, ctx) {
    const body = compact({ name: input.name, code: input.code });
    return await new GivebutterClient(ctx).data(`/funds/${encodeURIComponent(input.id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default fundUpdate;
