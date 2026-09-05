import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, sectionGroupPath } from "../lib/client.ts";
import {
  locationParams,
  sectionGroupIdParam,
  sectionGroupOutput,
  selectParams,
} from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  sectionGroupId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/onenote/sectionGroups/{id}` (and the `users`/`groups`/`sites` equivalents)
 *
 * https://learn.microsoft.com/en-us/graph/api/sectiongroup-get
 *
 * The default query expands `parentNotebook` and selects its `id`, `name`
 * and `self`. Valid `$expand` values are `parentNotebook` and
 * `parentSectionGroup`.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite`. Supported for both work-or-school and personal Microsoft
 * accounts.
 */
const getSectionGroup: ActionDefinition<Input> = {
  key: "get-section-group",
  type: "read",
  resource: "section-group",
  title: "Get Section Group",
  description: "Get a single OneNote section group by its ID.",
  params: [
    ...locationParams(),
    sectionGroupIdParam,
    ...selectParams("OData `$expand`, e.g. `parentNotebook`, `parentSectionGroup`."),
  ],
  output: sectionGroupOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(sectionGroupPath(input, input.sectionGroupId), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getSectionGroup;
