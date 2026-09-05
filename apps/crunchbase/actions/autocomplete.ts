import type { ActionDefinition } from "@w6w/types";
import { CrunchbaseClient } from "../lib/client.ts";

/**
 * `GET /data/autocompletes` — verified against Crunchbase's OpenAPI document
 * (`operationId: autocompletes`). Suggests entities matching a query string,
 * scoped to one or more collections. This is the endpoint every Crunchbase
 * package includes (`docs/crunchbase-basic-using-api` names it as one of
 * only three Basic-tier endpoints), and Crunchbase's own docs recommend it as
 * the way to resolve a fuzzy name into the exact uuid/permalink a Search or
 * Entity Lookup action needs (`docs/using-autocomplete-api`).
 *
 * `collection_ids` can be narrowed to a facet of a collection —
 * `organization.companies`, `organization.investors`, `organization.schools`,
 * `person.investors`, `principal.investors`, `location.cities` and similar
 * (`docs/using-autocomplete-api`) — which is a real, working query the
 * OpenAPI schema's enum does not itself enumerate (it only lists the 19 bare
 * collection names). This action leaves `collectionIds` a free-form
 * comma-separated string rather than a fixed `select`, since restricting it
 * to the documented enum would silently break the facet-qualified form
 * Crunchbase's own examples use.
 */
const action: ActionDefinition = {
  key: "autocomplete",
  type: "read",
  resource: "search",
  title: "Autocomplete",
  description: "Suggest entities matching a query string.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "collectionIds",
      label: "Collections",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank searches every identifier. Accepts a facet, e.g. " +
        '"organization.companies", "person.investors", "location.cities" — not just the bare ' +
        "collection name.",
      placeholder: "organizations,people",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      hint: "Max 25.",
    },
  ],
  output: [
    { key: "entities", type: "array", label: "Matching entities" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");

    ctx.log("info", "Crunchbase autocomplete", { query });

    return await new CrunchbaseClient(ctx).request(`/autocompletes`, {
      query: {
        query,
        collection_ids: typeof p.collectionIds === "string" && p.collectionIds.trim()
          ? p.collectionIds.trim()
          : undefined,
        limit: typeof p.limit === "number" ? p.limit : undefined,
      },
    });
  },
};

export default action;
