import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient } from "../lib/client.ts";
import { numericIdParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const householdGet: ActionDefinition<Input> = {
  key: "household-get",
  type: "read",
  resource: "household",
  title: "Get Household",
  description: "Fetch a single household, including its member contacts, by numeric id.",
  params: [numericIdParam("Household")],
  output: [
    { key: "id", type: "number", label: "Household ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "contacts", type: "array", label: "Member contacts" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).data(`/households/${encodeURIComponent(input.id)}`);
  },
};

export default householdGet;
