import type { ActionDefinition } from "@w6w/types";
import {
  type FindInput,
  findParams,
  LIMIT_PARAM,
  NutshellClient,
  type NutshellEntity,
  ORDER_BY_PARAM,
  ORDER_DIRECTION_PARAM,
  PAGE_PARAM,
  STUB_RESPONSES_PARAM,
} from "../lib/client.ts";

interface Input extends FindInput {
  hasOpenLeads?: boolean;
  tag?: string;
  query?: string;
}

/**
 * `findAccounts(query, orderBy, orderDirection, limit, page, stubResponses)`.
 *
 * Named params cover the two query keys most workflows reach for
 * (`hasOpenLeads`, `tag`); the rest of `Core::findAccounts`'s documented
 * vocabulary (`accountType`, `industry`, `territory`, `origin` — each an id
 * from its own `find*` method) is available via the raw `query` escape hatch.
 */
const findAccounts: ActionDefinition<Input, { records: NutshellEntity[]; count: number }> = {
  key: "find-accounts",
  type: "search",
  resource: "account",
  title: "Find Accounts",
  description: "Search Accounts (companies) by open-Lead status or tag, with an escape hatch " +
    "for any other documented query key (account type, industry, territory, origin).",
  params: [
    {
      key: "hasOpenLeads",
      label: "Has open Leads",
      type: "boolean",
      hint: "Only return Accounts associated with at least one open Lead.",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      hint: "Comma-separated tag names. An Account matching ANY of them is returned.",
    },
    {
      key: "query",
      label: "Additional query (JSON)",
      type: "json",
      hint: 'Any other findAccounts query keys, e.g. `{"industry": [1, 2]}`. Merged over the ' +
        "fields above.",
      advanced: true,
    },
    { ...ORDER_BY_PARAM, default: "name" },
    ORDER_DIRECTION_PARAM,
    LIMIT_PARAM,
    PAGE_PARAM,
    STUB_RESPONSES_PARAM,
  ],
  output: [
    { key: "records", type: "array", label: "Accounts" },
    { key: "count", type: "number", label: "Number of Accounts returned" },
  ],

  async execute(input, ctx) {
    const extra = input.query
      ? (() => {
        try {
          return JSON.parse(input.query) as Record<string, unknown>;
        } catch {
          throw new Error(`Additional query is not valid JSON: ${input.query}`);
        }
      })()
      : {};
    const query: Record<string, unknown> = {
      ...(input.hasOpenLeads !== undefined ? { hasOpenLeads: input.hasOpenLeads } : {}),
      ...(input.tag ? { tag: input.tag.split(",").map((t) => t.trim()).filter(Boolean) } : {}),
      ...extra,
    };

    const records = await new NutshellClient(ctx).call<NutshellEntity[]>("findAccounts", {
      query,
      ...findParams(input),
    });
    return { records, count: records.length };
  },
};

export default findAccounts;
