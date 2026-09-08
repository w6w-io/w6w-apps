import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { type DateRangeInput, dateRangeParams, dateRangeQuery, limitParam } from "../lib/params.ts";

interface Input extends DateRangeInput {
  limit?: number;
}

const squadList: ActionDefinition<Input> = {
  key: "squad-list",
  type: "search",
  resource: "squad",
  title: "List Squads",
  description: "List Squads — named groups of Assistants that hand off calls between themselves.",
  params: [limitParam, ...dateRangeParams()],
  output: [{ key: "items", type: "array", label: "Squads" }],

  async execute(input, ctx) {
    const items = await new VapiClient(ctx).json<unknown[]>("/squad", {
      query: { limit: input.limit, ...dateRangeQuery(input) },
    });
    return { items: stripSecrets(items) };
  },
};

export default squadList;
