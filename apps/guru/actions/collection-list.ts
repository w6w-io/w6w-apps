import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";

/**
 * `GET /api/v1/collections` — every undeleted Collection the credential can
 * see. No pagination is documented for this endpoint (unlike Cards, Folders
 * and members) — it returns a bare, uncapped array.
 *
 * A Collection token can only see the one Collection it was issued for; a
 * User token sees everything their account has access to. Looking up a
 * Collection's ID here is Guru's own documented prerequisite for using a
 * Collection token at all (see `auth/basic.ts`).
 */
interface Input {
  search?: string;
  sortField?: string;
  sortDir?: string;
  filter?: string;
}

const collectionList: ActionDefinition<Input> = {
  key: "collection-list",
  type: "search",
  resource: "collection",
  title: "List Collections",
  description: "List every Collection the connected account can see.",
  params: [
    { key: "search", label: "Search", type: "string" },
    { key: "sortField", label: "Sort field", type: "string", advanced: true },
    { key: "sortDir", label: "Sort direction", type: "string", advanced: true },
    { key: "filter", label: "Filter", type: "string", advanced: true },
  ],
  output: [{ key: "items", type: "array", label: "Collections" }],

  async execute(input, ctx) {
    const items = await new GuruClient(ctx).json<Record<string, unknown>[]>("/collections", {
      query: {
        search: input.search,
        sortField: input.sortField,
        sortDir: input.sortDir,
        filter: input.filter,
      },
    });
    return { items: (items ?? []).map(stripTokens) };
  },
};

export default collectionList;
