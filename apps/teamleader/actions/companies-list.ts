import type { ActionDefinition } from "@w6w/types";
import { callWithMeta, compact } from "../lib/client.ts";
import { idsParam, pageBody, pageParams, tagsParam, updatedSinceParam } from "../lib/params.ts";

/**
 * `POST /companies.list` — verified against
 * `developer.focus.teamleader.eu/docs/api/companies-list` on 2026-09-01.
 */
interface Input {
  ids?: string[];
  term?: string;
  updatedSince?: string;
  tags?: string[];
  vatNumber?: string;
  nationalIdentificationNumber?: string;
  status?: "active" | "deactivated";
  pageSize?: number;
  pageNumber?: number;
  includes?: string;
}

interface PageMeta {
  page?: { size?: number; number?: number };
  matches?: number;
}

const companiesList: ActionDefinition<Input> = {
  key: "companies-list",
  type: "search",
  resource: "company",
  title: "List Companies",
  description: "Get a list of companies, optionally filtered by VAT number, tags, status or a " +
    "free-text search term.",
  params: [
    idsParam,
    {
      key: "term",
      label: "Search term",
      type: "string",
      hint: "Filters on name, VAT number, emails and telephones.",
    },
    updatedSinceParam,
    tagsParam,
    { key: "vatNumber", label: "VAT number", type: "string", placeholder: "BE 0899.623.035" },
    {
      key: "nationalIdentificationNumber",
      label: "National identification number",
      type: "string",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "active", label: "Active" }, {
        value: "deactivated",
        label: "Deactivated",
      }],
    },
    ...pageParams(),
    {
      key: "includes",
      label: "Includes",
      type: "string",
      placeholder: "custom_fields",
      hint: "Comma-separated list of optional includes.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Companies" },
    { key: "matches", type: "number", label: "Total matching companies" },
  ],

  async execute(input, ctx) {
    const filter = compact({
      ids: input.ids,
      term: input.term,
      updated_since: input.updatedSince,
      tags: input.tags,
      vat_number: input.vatNumber,
      national_identification_number: input.nationalIdentificationNumber,
      status: input.status,
    });

    const { data, meta } = await callWithMeta<unknown[], PageMeta>(
      ctx,
      "companies.list",
      compact({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        page: pageBody(input),
        includes: input.includes,
      }),
    );

    return { items: data ?? [], matches: meta?.matches };
  },
};

export default companiesList;
