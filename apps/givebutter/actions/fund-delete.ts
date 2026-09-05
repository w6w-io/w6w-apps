import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const fundDelete: ActionDefinition<Input> = {
  key: "fund-delete",
  type: "perform",
  resource: "fund",
  title: "Delete Fund",
  description: "Delete a fund.",
  idempotent: true,
  params: [idParam("Fund")],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new GivebutterClient(ctx).status(
      `/funds/${encodeURIComponent(input.id)}`,
      {
        method: "DELETE",
      },
    );
    return { status };
  },
};

export default fundDelete;
