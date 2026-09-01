import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";

/**
 * `GET /v1/business-units/search` — public, API-Key auth.
 *
 * Searches Trustpilot's whole directory of Business Units by name — this is also the
 * practical way to find a Business Unit's id for a given domain, since Trustpilot's
 * dedicated `/v1/business-units/find` endpoint (documented as the canonical way to look
 * one up) publishes no response schema on its reference page and is left out of this app
 * for that reason (see README).
 *
 * Note the endpoint's own query parameter is lower-cased `perpage` — unlike the `perPage`
 * used by the reviews endpoints — verified on the wire example in the reference page.
 */
interface Input {
  query: string;
  country?: string;
  page?: number;
  perPage?: number;
}

interface BusinessUnitSummary {
  id?: string;
  displayName?: string;
  name?: { identifying?: string; referring?: string[] };
}

interface Output {
  items: BusinessUnitSummary[];
}

const businessUnitSearch: ActionDefinition<Input, Output> = {
  key: "business-unit-search",
  type: "search",
  resource: "business-unit",
  title: "Search Business Units",
  description: "Search Trustpilot's directory of Business Units by name — also how to " +
    "find a Business Unit's id for a known domain.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "example.com",
      hint: "Search term — matches identifying and referring names.",
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      placeholder: "US",
      hint: "2-letter preferred country code.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Results per page",
      type: "number",
      validation: { integer: true, min: 1 },
      default: 20,
      hint: "Trustpilot's directory search has no documented ceiling; this app defaults it " +
        "to a small page.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Business units" },
  ],

  async execute(input, ctx) {
    const body = await requestApi<{ businessUnits?: BusinessUnitSummary[] }>(
      ctx,
      "/business-units/search",
      {
        query: {
          query: input.query,
          country: input.country,
          page: input.page,
          perpage: input.perPage,
        },
      },
    );
    return { items: body?.businessUnits ?? [] };
  },
};

export default businessUnitSearch;
