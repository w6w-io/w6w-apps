import type { ActionDefinition } from "@w6w/types";
import { encodeSegment, PodioClient, toList } from "../lib/client.ts";
import { appIdParam } from "../lib/params.ts";

/**
 * `POST /search/app/{app_id}/` — "Searches in all items and tasks in the app."
 *
 * The answer to the gap Filter Items leaves: Podio's Views area says text
 * fields "cannot be used for filtering" and points here instead. So anything
 * shaped like "find the item whose name contains X" is this action, not that
 * one.
 *
 * The request body is the one documented for Search in Space —
 * `{query, limit, offset, ref_type}` — with the vendor's own cap stated in it:
 * "up to 20 results are returned in one call". That is a hard ceiling, not a
 * default, so a workflow needing more has to page with `offset`.
 *
 * `search_fields` is a documented query parameter of this endpoint ("Can f.ex.
 * be used to limit the search to the 'title' field") and is exposed as a
 * multiselect of field names.
 *
 * Results are search hits, not items: `{type, id, rank, title, link, created_on,
 * created_by, space, org, app}`. There are no field values in them. Feed `id`
 * into Get Item when the workflow needs the record itself.
 */
interface Input {
  appId: string;
  query: string;
  refType?: string;
  searchFields?: string[] | string;
  limit?: number;
  offset?: number;
}

const searchApp: ActionDefinition<Input> = {
  key: "search-app",
  type: "search",
  resource: "search",
  title: "Search in App",
  description:
    "Full-text search across one app's items and tasks. This is how you match on text — " +
    "Filter Items cannot filter text fields. Returns hits (id, title, link), not values.",
  params: [
    appIdParam,
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
      options: [
        { value: "item", label: "item" },
        { value: "task", label: "task" },
      ],
      validation: { enum: ["item", "task"] },
      hint: "Restrict results to one kind. This endpoint searches items and tasks only; the " +
        "wider vocabulary Podio documents belongs to the space and global searches.",
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
      hint: "Podio returns at most 20 results per call. Page with the offset for more.",
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
      `/search/app/${encodeSegment(input.appId)}/`,
      { method: "POST", body, query: { search_fields: toList(input.searchFields) } },
    );
    return { results: results ?? [] };
  },
};

export default searchApp;
