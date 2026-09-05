import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, pagePath } from "../lib/client.ts";
import { locationParams, pageIdParam, pageOutput, selectParams } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  pageId: string;
  select?: string[];
  expand?: string[];
}

/**
 * `GET /me/onenote/pages/{id}` (and the `users`/`groups`/`sites` equivalents) — metadata only.
 *
 * https://learn.microsoft.com/en-us/graph/api/page-get
 *
 * This returns the page's PROPERTIES (title, timestamps, links) — not its
 * HTML body. The `onenotePage` resource type lists a `content` property, but
 * the reference's own examples read content from the separate `/content`
 * endpoint; use Get Page Content for that.
 *
 * The default response expands `parentSection` and selects its `id`, `name`
 * and `self`. Valid `$expand` values are `parentNotebook` and `parentSection`.
 *
 * Least privileged delegated permission: `Notes.Read`. This App requests the
 * broader `Notes.ReadWrite`. Supported for both work-or-school and personal
 * Microsoft accounts.
 */
const getPage: ActionDefinition<Input> = {
  key: "get-page",
  type: "read",
  resource: "page",
  title: "Get Page",
  description: "Get a OneNote page's metadata (title, timestamps, links) by its ID.",
  params: [
    ...locationParams(),
    pageIdParam,
    ...selectParams("OData `$expand`, e.g. `parentNotebook`, `parentSection`."),
  ],
  output: pageOutput,

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(pagePath(input, input.pageId), {
      query: { $select: odataList(input.select), $expand: odataList(input.expand) },
    });
  },
};

export default getPage;
