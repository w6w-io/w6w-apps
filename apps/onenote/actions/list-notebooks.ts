import type { ActionDefinition } from "@w6w/types";
import { GraphClient, notebooksPath, odataList, type PagedResult } from "../lib/client.ts";
import { listOutput, locationParams, pagingParams, selectParams } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Notebook {
  id?: string;
  displayName?: string;
  [k: string]: unknown;
}

/**
 * `GET /me/onenote/notebooks` · `GET /users/{id}/onenote/notebooks` ·
 * `GET /groups/{id}/onenote/notebooks` · `GET /sites/{id}/onenote/notebooks`
 *
 * https://learn.microsoft.com/en-us/graph/api/onenote-list-notebooks
 *
 * Default sort order is `name asc`. Valid `$expand` values are `sections` and
 * `sectionGroups`.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite` so pre-existing notebooks are listed too. Supported for
 * both work-or-school and personal Microsoft accounts.
 */
const listNotebooks: ActionDefinition<Input, PagedResult<Notebook>> = {
  key: "list-notebooks",
  type: "read",
  resource: "notebook",
  title: "List Notebooks",
  description: "List the OneNote notebooks the connected account can access.",
  params: [
    ...locationParams(),
    ...selectParams("OData `$expand`, e.g. `sections`, `sectionGroups`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Notebook>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? notebooksPath(input);
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Notebook>(target, opts, input.maxPages ?? 10)
      : await client.page<Notebook>(target, opts);
  },
};

export default listNotebooks;
