import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, type ApifyListPage, flag } from "../lib/client.ts";
import { paginationParams, storePricingModelOptions, storeSortByOptions } from "../lib/params.ts";

/**
 * `GET /v2/store` — search the public Apify Store.
 *
 * ## The default limit is a trap
 *
 * Apify documents `limit` as defaulting to its maximum of 1,000, and the Store
 * holds 46,050 Actors (measured 2026-08-11). The vendor default therefore
 * returns **3.8 MB** in one response — measured, not estimated. This action
 * prefills 20.
 *
 * ## This endpoint needs no credential
 *
 * It answers `200` with no token at all (measured 2026-08-11), which is why it
 * is emphatically *not* the credential probe: a Connection whose token never got
 * attached would pass a check against it. See `auth/api-token.ts`. Requests from
 * this app are signed anyway, which costs nothing.
 *
 * ## Safety filtering is on by default
 *
 * Apify excludes Actors "not safe to run automatically" — those from developers
 * who have not passed KYC, and full-permission Actors without a large user base.
 * `includeUnrunnableActors` turns that off. It is exposed because the filter is
 * otherwise invisible and someone will wonder why their own new Actor is
 * missing; it is off by default because the filter is the right default for a
 * workflow that then *runs* what it finds.
 */
interface Input {
  search?: string;
  sortBy?: string;
  category?: string;
  username?: string;
  pricingModel?: string;
  includeUnrunnableActors?: boolean;
  limit?: number;
  offset?: number;
}

const storeSearch: ActionDefinition<Input> = {
  key: "store-search",
  type: "search",
  resource: "actor",
  title: "Search Apify Store",
  description: "Search the public Apify Store for Actors by text, category, author or pricing.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matched against title, name, description, username and readme.",
    },
    { key: "sortBy", label: "Sort by", type: "select", options: storeSortByOptions },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "Apify's own Store category, as shown on the Store page.",
    },
    {
      key: "username",
      label: "Author username",
      type: "string",
      hint: "Only Actors published by this Apify user.",
    },
    {
      key: "pricingModel",
      label: "Pricing model",
      type: "select",
      options: storePricingModelOptions,
    },
    {
      key: "includeUnrunnableActors",
      label: "Include Actors excluded by safety filtering",
      type: "boolean",
      hint:
        "Off by default, matching the API: results normally exclude Actors from developers who " +
        "have not passed KYC and full-permission Actors without a large user base.",
    },
    ...paginationParams(
      20,
      "Apify's own default is its maximum of 1000, which returns several megabytes across a " +
        "46,000-Actor Store. 20 is prefilled here.",
    ),
  ],
  output: [
    { key: "items", type: "array", label: "Store Actors" },
    { key: "total", type: "number", label: "Total matching Actors" },
    { key: "count", type: "number", label: "Actors in this page" },
    { key: "offset", type: "number", label: "Offset of this page" },
  ],

  execute(input, ctx) {
    return new ApifyClient(ctx).data<ApifyListPage<unknown>>("/store", {
      query: {
        search: input.search,
        sortBy: input.sortBy,
        category: input.category,
        username: input.username,
        pricingModel: input.pricingModel,
        includeUnrunnableActors: flag(input.includeUnrunnableActors),
        limit: input.limit,
        offset: input.offset,
      },
    });
  },
};

export default storeSearch;
