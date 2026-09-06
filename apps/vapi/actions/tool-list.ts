import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { type DateRangeInput, dateRangeParams, dateRangeQuery, limitParam } from "../lib/params.ts";

/**
 * `GET /tool` — every Tool an Assistant can call: API Request, Code,
 * Function, DTMF, End Call, Transfer Call, Handoff, Bash, Computer, Text
 * Editor, Query and more. This app does not create or update Tools — the
 * request body is a twelve-way discriminated union, one of the config
 * objects this app deliberately leaves to the dashboard/API-direct — but
 * reading the catalog by id has no such complexity.
 */
interface Input extends DateRangeInput {
  limit?: number;
}

const toolList: ActionDefinition<Input> = {
  key: "tool-list",
  type: "search",
  resource: "tool",
  title: "List Tools",
  description: "List the Tools (functions, API requests, transfers, …) configured in this project.",
  params: [limitParam, ...dateRangeParams()],
  output: [{ key: "items", type: "array", label: "Tools" }],

  async execute(input, ctx) {
    const items = await new VapiClient(ctx).json<unknown[]>("/tool", {
      query: { limit: input.limit, ...dateRangeQuery(input) },
    });
    return { items: stripSecrets(items) };
  },
};

export default toolList;
