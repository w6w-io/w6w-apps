import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, type ApolloPagination, compact, type QueryValue } from "../lib/client.ts";
import { extraFiltersParam, paginationParams, parseJsonObject } from "../lib/params.ts";

/**
 * `POST /mixed_companies/search` — find companies Apollo has NOT yet saved as accounts
 * in your team's Apollo instance.
 *
 * Unlike `people-search`, this returns full company records (not obfuscated) — and
 * costs **1 credit per page** (up to 100 results/page), not 0. All filters are QUERY
 * parameters despite the POST verb; see `lib/client.ts`'s module doc.
 */
interface Input {
  q_organization_name?: string;
  q_organization_domains_list?: string[] | string;
  organization_locations?: string[] | string;
  organization_not_locations?: string[] | string;
  organization_num_employees_ranges?: string[] | string;
  q_organization_keyword_tags?: string[] | string;
  currently_using_any_of_technology_uids?: string[] | string;
  organization_ids?: string[] | string;
  revenue_min?: number;
  revenue_max?: number;
  total_funding_min?: number;
  total_funding_max?: number;
  page?: number;
  per_page?: number;
  extraFilters?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const organizationSearch: ActionDefinition<Input> = {
  key: "organization-search",
  type: "search",
  resource: "organization",
  title: "Search Organizations",
  description: "Search Apollo's database of 30M+ companies. Costs 1 credit per page (up to 100 " +
    "results/page).",
  params: [
    { key: "q_organization_name", label: "Company name", type: "string" },
    {
      key: "q_organization_domains_list",
      label: "Domains",
      type: "string",
      hint: "Comma-separated, e.g. `apollo.io, microsoft.com`.",
    },
    {
      key: "organization_locations",
      label: "HQ locations",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "organization_not_locations",
      label: "Exclude HQ locations",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "organization_num_employees_ranges",
      label: "Employee count ranges",
      type: "string",
      hint: "Comma-separated ranges, e.g. `1,10;250,1000`.",
    },
    {
      key: "q_organization_keyword_tags",
      label: "Keyword tags",
      type: "string",
      advanced: true,
      hint: "Comma-separated industry/keyword tags.",
    },
    {
      key: "currently_using_any_of_technology_uids",
      label: "Uses any of these technologies",
      type: "string",
      advanced: true,
      hint: "Comma-separated Apollo technology UIDs, e.g. `salesforce, hubspot`.",
    },
    {
      key: "organization_ids",
      label: "Apollo organization IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    { key: "revenue_min", label: "Revenue min (USD)", type: "number", advanced: true },
    { key: "revenue_max", label: "Revenue max (USD)", type: "number", advanced: true },
    { key: "total_funding_min", label: "Total funding min (USD)", type: "number", advanced: true },
    { key: "total_funding_max", label: "Total funding max (USD)", type: "number", advanced: true },
    ...paginationParams(25, "Max 100 results/page; each page costs 1 credit."),
    extraFiltersParam,
  ],
  output: [
    { key: "organizations", type: "array", label: "Matching organizations" },
    { key: "pagination", type: "object", label: "page, per_page, total_entries, total_pages" },
  ],

  async execute(input, ctx) {
    const query: Record<string, QueryValue> = {
      ...compact({
        q_organization_name: input.q_organization_name,
        q_organization_domains_list: toArr(input.q_organization_domains_list),
        organization_locations: toArr(input.organization_locations),
        organization_not_locations: toArr(input.organization_not_locations),
        organization_num_employees_ranges: toArr(input.organization_num_employees_ranges),
        q_organization_keyword_tags: toArr(input.q_organization_keyword_tags),
        currently_using_any_of_technology_uids: toArr(input.currently_using_any_of_technology_uids),
        organization_ids: toArr(input.organization_ids),
        "revenue_range[min]": input.revenue_min,
        "revenue_range[max]": input.revenue_max,
        "total_funding_range[min]": input.total_funding_min,
        "total_funding_range[max]": input.total_funding_max,
        page: input.page,
        per_page: input.per_page,
      }),
      ...(parseJsonObject(input.extraFilters, "Additional filters") as Record<string, QueryValue>),
    };

    const body = await new ApolloClient(ctx).post<
      { organizations?: unknown[]; pagination?: ApolloPagination }
    >("/mixed_companies/search", { query });
    return { organizations: body.organizations ?? [], pagination: body.pagination ?? {} };
  },
};

export default organizationSearch;
