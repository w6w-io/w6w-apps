import type { ActionDefinition } from "@w6w/types";
import { requestApi } from "../lib/client.ts";
import { businessUnitIdParam } from "../lib/params.ts";

/**
 * `GET /v1/business-units/{businessUnitId}/categories` — public, API-Key auth.
 */
interface Input {
  businessUnitId: string;
  country?: string;
  locale?: string;
}

interface Category {
  categoryId?: string;
  displayName?: string;
  name?: string;
  isPrimary?: boolean;
  ranking?: { position?: number; cardinality?: number };
  source?: string;
  relevance?: number;
}

interface Output {
  categories: Category[];
  predictedTopCategory?: unknown;
}

const businessUnitListCategories: ActionDefinition<Input, Output> = {
  key: "business-unit-list-categories",
  type: "read",
  resource: "business-unit",
  title: "List Business Unit Categories",
  description: "List the Trustpilot categories a Business Unit is listed under.",
  params: [
    businessUnitIdParam,
    {
      key: "country",
      label: "Country",
      type: "string",
      placeholder: "US",
      hint: "ISO 3166-1-alpha-2 country code.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      placeholder: "en-US",
      hint: "Translate category display names into this locale.",
    },
  ],
  output: [
    { key: "categories", type: "array", label: "Categories" },
    { key: "predictedTopCategory", type: "object", label: "Predicted top category" },
  ],

  async execute(input, ctx) {
    return await requestApi<Output>(
      ctx,
      `/business-units/${encodeURIComponent(input.businessUnitId)}/categories`,
      { query: { country: input.country, locale: input.locale } },
    );
  },
};

export default businessUnitListCategories;
