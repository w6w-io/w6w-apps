import type { ActionDefinition } from "@w6w/types";
import { LglClient } from "../lib/client.ts";
import {
  compact,
  envelopeOutput,
  expandParam,
  expandQuery,
  filtersParam,
  filtersQuery,
  paginationParams,
  paginationQuery,
  sortParams,
  sortQuery,
} from "../lib/params.ts";

interface Input {
  filters: string[];
  expand?: string[];
  sort?: string;
  sortDescending?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * `GET /api/v1/constituents/search.json`.
 *
 * LGL's own doc for this endpoint confirms one worked filter (`name=brady`)
 * and names the sortable fields; the full set of valid `q[]` filter field
 * names beyond those is not enumerated anywhere in the reference.
 */
const constituentSearch: ActionDefinition<Input> = {
  key: "constituent-search",
  type: "search",
  resource: "constituent",
  title: "Search Constituents",
  description:
    "Search active constituents. Confirmed filter field: 'name' (e.g. \"name=brady\"). " +
    "Confirmed sort fields: name, external_id, lgl_id, date_created, date_updated, " +
    "membership_level, membership_end_date_from.",
  params: [
    filtersParam("name=brady"),
    expandParam([
      "class_affiliations",
      "relationships",
      "street_addresses",
      "phone_numbers",
      "email_addresses",
      "web_addresses",
      "categories",
      "groups",
      "memberships",
      "custom_attrs",
    ]),
    ...sortParams([
      "name",
      "external_id",
      "lgl_id",
      "date_created",
      "date_updated",
      "membership_level",
      "membership_end_date_from",
    ]),
    ...paginationParams(),
  ],
  output: envelopeOutput,

  async execute(input, ctx) {
    const envelope = await new LglClient(ctx).list("/constituents/search", {
      filters: filtersQuery(input),
      query: compact({
        expand: expandQuery(input),
        sort: sortQuery(input),
        ...paginationQuery(input),
      }),
    });
    return envelope;
  },
};

export default constituentSearch;
