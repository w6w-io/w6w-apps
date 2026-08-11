import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient, toList } from "../lib/client.ts";
import { spaceIdParam } from "../lib/params.ts";

/**
 * `POST /search/space/{space_id}/` — "Searches in all items, statuses and
 * non-private tasks in the space."
 *
 * The workspace-wide search. Note the exclusion in the vendor's own sentence:
 * **non-private** tasks. A task marked private is invisible here even to
 * someone who could open it directly, so a workflow counting "everything
 * matching X" will undercount and cannot tell.
 *
 * `ref_type` is wider than on Search in App — "item", "task", "conversation",
 * "app", "status", "file" and "profile" — because a workspace holds more kinds
 * of thing than an app does.
 *
 * Results are ordered "descending by the time the object had any update", and
 * capped at 20 per call like every Podio search.
 *
 * This endpoint carries no App Authentication badge in Podio's reference: an
 * app token is scoped to one app, and a workspace search reaches past it.
 */
interface Input {
  spaceId: string;
  query: string;
  refType?: string;
  searchFields?: string[] | string;
  limit?: number;
  offset?: number;
}

const REF_TYPES = ["item", "task", "conversation", "app", "status", "file", "profile"];

const searchSpace: ActionDefinition<Input> = {
  key: "search-space",
  type: "search",
  resource: "search",
  title: "Search in Workspace",
  description:
    "Full-text search across a whole workspace — items, statuses and non-private tasks — " +
    "newest activity first. Private tasks are excluded and are not reported as omitted.",
  params: [
    spaceIdParam,
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint: "The text to search for.",
    },
    {
      key: "refType",
      label: "Result type",
      type: "select",
      options: REF_TYPES.map((v) => ({ value: v, label: v })),
      validation: { enum: REF_TYPES },
      hint: "Restrict results to one kind of object.",
    },
    {
      key: "searchFields",
      label: "Search fields",
      type: "multiselect",
      hint: "Limit the search to named fields, e.g. title.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 1, max: 20 },
      hint: "Podio returns at most 20 results per call.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "The rank of the first result to return. Podio's default is 0.",
    },
  ],
  output: [{ key: "results", type: "array", label: "Search hits" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { query: input.query };
    if (input.limit !== undefined) body.limit = input.limit;
    if (input.offset !== undefined) body.offset = input.offset;
    if (input.refType) body.ref_type = input.refType;

    const results = await new PodioClient(ctx).json<unknown[]>(
      `/search/space/${encodeSegment(input.spaceId)}/`,
      { method: "POST", body, query: { search_fields: toList(input.searchFields) } },
    );
    return { results: results ?? [] };
  },
};

export default searchSpace;
