import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact, type QueryValue } from "../lib/client.ts";
import { extraFiltersParam, paginationParams, parseJsonObject } from "../lib/params.ts";

/**
 * `POST /mixed_people/api_search` — find net-new prospects Apollo has NOT yet saved as
 * contacts in your team's account.
 *
 * Two things worth knowing before using this:
 *
 *  - **It costs 0 credits, and it never returns an email or phone number.** Names come
 *    back obfuscated (`"last_name_obfuscated": "Hu***n"`) and organizations as booleans
 *    (`has_email`, `has_direct_phone`, …) rather than values — this endpoint is for
 *    finding and counting matches, not for enriching them. Chain a result's `id` into
 *    `people-enrich` to get real contact details (that call does cost credits).
 *  - **It has a hard display ceiling of 50,000 records** (100 per page, up to 500
 *    pages), regardless of `total_entries`. Add more filters to narrow a search that
 *    hits it rather than trying to page past it.
 *
 * All filters here are QUERY parameters despite the POST verb, including array filters
 * sent in bracket notation (`person_titles[]=...`) — see `lib/client.ts`'s module doc.
 */
interface Input {
  q_keywords?: string;
  person_titles?: string[] | string;
  include_similar_titles?: boolean;
  person_seniorities?: string[] | string;
  person_locations?: string[] | string;
  organization_locations?: string[] | string;
  q_organization_domains_list?: string[] | string;
  organization_ids?: string[] | string;
  organization_num_employees_ranges?: string[] | string;
  contact_email_status?: string[] | string;
  revenue_min?: number;
  revenue_max?: number;
  page?: number;
  per_page?: number;
  extraFilters?: unknown;
}

function toArr(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean);
}

const peopleSearch: ActionDefinition<Input> = {
  key: "people-search",
  type: "search",
  resource: "person",
  title: "Search People",
  description: "Search Apollo's database of 240M+ people for net-new prospects. Costs 0 credits " +
    "and returns no email/phone — enrich a match afterwards to reveal contact details.",
  params: [
    { key: "q_keywords", label: "Keywords", type: "string" },
    {
      key: "person_titles",
      label: "Job titles",
      type: "string",
      hint: "Comma-separated, e.g. `CEO, Head of Sales`.",
    },
    {
      key: "include_similar_titles",
      label: "Include similar titles",
      type: "boolean",
      hint: "Broadens Job titles to related titles too.",
    },
    {
      key: "person_seniorities",
      label: "Seniorities",
      type: "string",
      hint: "Comma-separated, e.g. `director, vp, c_suite`.",
    },
    {
      key: "person_locations",
      label: "Person locations",
      type: "string",
      hint: "Comma-separated.",
    },
    {
      key: "organization_locations",
      label: "Employer HQ locations",
      type: "string",
      hint: "Comma-separated. Filters by the employer's HQ location, not the person's.",
    },
    {
      key: "q_organization_domains_list",
      label: "Employer domains",
      type: "string",
      hint: "Comma-separated, e.g. `apollo.io, microsoft.com`.",
    },
    {
      key: "organization_ids",
      label: "Apollo organization IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "organization_num_employees_ranges",
      label: "Employer size ranges",
      type: "string",
      advanced: true,
      hint: "Comma-separated ranges, e.g. `1,10;250,1000`.",
    },
    {
      key: "contact_email_status",
      label: "Email status",
      type: "string",
      advanced: true,
      hint: "Comma-separated, e.g. `verified, likely_to_engage`.",
    },
    { key: "revenue_min", label: "Employer revenue min (USD)", type: "number", advanced: true },
    { key: "revenue_max", label: "Employer revenue max (USD)", type: "number", advanced: true },
    ...paginationParams(25, "Max 100 records/page, and the search itself caps at 50,000 results."),
    extraFiltersParam,
  ],
  output: [
    { key: "people", type: "array", label: "Matching people (obfuscated)" },
    { key: "total_entries", type: "number", label: "Total matches, capped at 50,000 by the API" },
  ],

  async execute(input, ctx) {
    const query: Record<string, QueryValue> = {
      ...compact({
        q_keywords: input.q_keywords,
        person_titles: toArr(input.person_titles),
        include_similar_titles: input.include_similar_titles,
        person_seniorities: toArr(input.person_seniorities),
        person_locations: toArr(input.person_locations),
        organization_locations: toArr(input.organization_locations),
        q_organization_domains_list: toArr(input.q_organization_domains_list),
        organization_ids: toArr(input.organization_ids),
        organization_num_employees_ranges: toArr(input.organization_num_employees_ranges),
        contact_email_status: toArr(input.contact_email_status),
        "revenue_range[min]": input.revenue_min,
        "revenue_range[max]": input.revenue_max,
        page: input.page,
        per_page: input.per_page,
      }),
      ...(parseJsonObject(input.extraFilters, "Additional filters") as Record<string, QueryValue>),
    };

    const body = await new ApolloClient(ctx).post<{ people?: unknown[]; total_entries?: number }>(
      "/mixed_people/api_search",
      { query },
    );
    return { people: body.people ?? [], total_entries: body.total_entries ?? 0 };
  },
};

export default peopleSearch;
