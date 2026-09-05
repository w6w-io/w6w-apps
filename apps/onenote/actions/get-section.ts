import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, sectionPath } from "../lib/client.ts";
import { locationParams, sectionIdParam, sectionOutput, selectParams } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  sectionId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/onenote/sections/{id}` (and the `users`/`groups`/`sites` equivalents)
 *
 * https://learn.microsoft.com/en-us/graph/api/onenotesection-get
 *
 * The default query expands `parentNotebook` and selects its `id`,
 * `displayName` and `self`. Valid `$expand` values are `parentNotebook` and
 * `parentSectionGroup`.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite`. Supported for both work-or-school and personal Microsoft
 * accounts.
 */
const getSection: ActionDefinition<Input> = {
  key: "get-section",
  type: "read",
  resource: "section",
  title: "Get Section",
  description: "Get a single OneNote section by its ID.",
  params: [
    ...locationParams(),
    sectionIdParam,
    ...selectParams("OData `$expand`, e.g. `parentNotebook`, `parentSectionGroup`."),
  ],
  output: sectionOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(sectionPath(input, input.sectionId), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getSection;
