import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { type DateRangeInput, dateRangeParams, dateRangeQuery, limitParam } from "../lib/params.ts";

/**
 * `GET /assistant` — the Assistants configured in this project.
 *
 * Bare array, no envelope. Paginate with the date-range filters, not an
 * offset: this endpoint has none.
 */
interface Input extends DateRangeInput {
  limit?: number;
}

const assistantList: ActionDefinition<Input> = {
  key: "assistant-list",
  type: "search",
  resource: "assistant",
  title: "List Assistants",
  description: "List the voice AI Assistants configured in this project.",
  params: [limitParam, ...dateRangeParams()],
  output: [{ key: "items", type: "array", label: "Assistants" }],

  async execute(input, ctx) {
    const items = await new VapiClient(ctx).json<unknown[]>("/assistant", {
      query: { limit: input.limit, ...dateRangeQuery(input) },
    });
    return { items: stripSecrets(items) };
  },
};

export default assistantList;
