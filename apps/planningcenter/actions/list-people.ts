import type { ActionDefinition } from "@w6w/types";
import { type JsonApiCollection, PlanningCenterClient } from "../lib/client.ts";

interface Input {
  search?: string;
  status?: "active" | "inactive";
  perPage?: number;
  offset?: number;
}

interface PersonAttributes {
  first_name?: string;
  last_name?: string;
  name?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  avatar?: string;
}

interface Output {
  people: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    avatar?: string;
  }>;
  totalCount?: number;
  nextOffset?: number;
}

/**
 * `GET /people/v2/people` — the People module's directory listing.
 *
 * `search` maps to `where[search_name_or_email_or_phone_number]`, one of the
 * documented `can_query_by` values for `Person` (verified against the live
 * OpenAPI document's `organization_people_collection_envelope.meta.can_query_by`
 * enum) — it matches across name, email and phone in one filter rather than
 * requiring three separate `where[...]` params.
 *
 * Does NOT request `primary_email_address` — see `lib/client.ts` for why that
 * documented-but-gated attribute is read via `get-person`'s `?include=emails`
 * instead of an unverifiable `fields[Person]` value.
 */
const listPeople: ActionDefinition<Input, Output> = {
  key: "list-people",
  type: "search",
  title: "List People",
  description: "Search or list people in the People directory.",
  params: [
    {
      key: "search",
      label: "Search",
      type: "string",
      hint: "Matches against name, email address or phone number.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
      hint: "Defaults to active people only, same as the Planning Center directory view.",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      hint: "Maximum 100.",
    },
    { key: "offset", label: "Offset", type: "number", default: 0 },
  ],
  output: [
    { key: "people", type: "array", label: "People" },
    { key: "totalCount", type: "number", label: "Total count" },
    { key: "nextOffset", type: "number", label: "Next page offset" },
  ],

  async execute(input, ctx) {
    const client = new PlanningCenterClient(ctx);
    const body = await client.get<JsonApiCollection<PersonAttributes>>("people", "/people", {
      where: { search_name_or_email_or_phone_number: input.search, status: input.status },
      query: { per_page: input.perPage ?? 25, offset: input.offset ?? 0 },
    });

    return {
      people: body.data.map((p) => ({
        id: p.id,
        firstName: p.attributes.first_name,
        lastName: p.attributes.last_name,
        name: p.attributes.name,
        status: p.attributes.status,
        createdAt: p.attributes.created_at,
        updatedAt: p.attributes.updated_at,
        avatar: p.attributes.avatar,
      })),
      totalCount: body.meta?.total_count,
      nextOffset: body.meta?.next?.offset,
    };
  },
};

export default listPeople;
