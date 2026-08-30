import type { ActionDefinition } from "@w6w/types";
import { MauticClient } from "../lib/client.ts";
import { LIST_PARAMS, SEARCH_PARAM } from "../lib/params.ts";

/**
 * `GET /companies` — verified against Mautic's REST API docs
 * (`companies.html`, "List Companies").
 */
const action: ActionDefinition = {
  key: "company-list",
  type: "read",
  resource: "company",
  title: "List companies",
  description: "List companies, optionally filtered by a Mautic search command.",
  params: [SEARCH_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 30);

    ctx.log("info", "listing Mautic companies", { returnAll });

    return await new MauticClient(ctx).requestAll(
      "/companies",
      "companies",
      { query: { search: (p.search as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
