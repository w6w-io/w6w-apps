import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const householdDelete: ActionDefinition<Input> = {
  key: "household-delete",
  type: "perform",
  resource: "household",
  title: "Delete Household",
  description: "Delete a household. Its member contacts are not deleted.",
  idempotent: true,
  params: [numericIdParam("Household")],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new GivebutterClient(ctx).status(
      `/households/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default householdDelete;
