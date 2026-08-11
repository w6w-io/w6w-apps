import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /tags` — the account's tags.
 *
 * This is where a `tagId` comes from, and every tagging call in this app takes
 * ids rather than names — GetResponse does not create a tag implicitly when you
 * reference an unknown name, it rejects the request.
 */
interface Input {
  name?: string;
  sortDirection?: string;
  page?: number;
  perPage?: number;
}

const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the account's tags, with the id each one is referenced by.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Filter by tag name." },
    {
      key: "sortDirection",
      label: "Sort by name",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [{ key: "[]", type: "array", label: "Tags — `tagId` is what the tagging actions take" }],

  execute(input, ctx) {
    const query = buildQuery({
      query: { name: input.name },
      sort: input.sortDirection ? { name: input.sortDirection } : undefined,
      page: input.page,
      perPage: input.perPage,
    });
    return new GetResponseClient(ctx).request("/tags", { query });
  },
};

export default tagList;
