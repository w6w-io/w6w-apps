import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient } from "../lib/client.ts";

interface Input {
  name: string;
  code?: string;
}

const fundCreate: ActionDefinition<Input> = {
  key: "fund-create",
  type: "perform",
  resource: "fund",
  title: "Create Fund",
  description: "Create a new fund.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true, validation: { maxLength: 255 } },
    { key: "code", label: "Code", type: "string", validation: { maxLength: 255 } },
  ],
  output: [
    { key: "id", type: "string", label: "Fund ID" },
    { key: "code", type: "string", label: "Fund code" },
  ],

  async execute(input, ctx) {
    const body = compact({ name: input.name, code: input.code });
    return await new GivebutterClient(ctx).data("/funds", { method: "POST", body });
  },
};

export default fundCreate;
