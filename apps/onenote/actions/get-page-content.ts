import type { ActionDefinition } from "@w6w/types";
import { GraphClient, pagePath } from "../lib/client.ts";
import { locationParams, pageIdParam } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  pageId: string;
  includeIds?: boolean;
}

interface Output {
  content: string;
}

/**
 * `GET /me/onenote/pages/{id}/content` (and the `users`/`groups`/`sites` equivalents)
 *
 * https://learn.microsoft.com/en-us/graph/api/page-get
 *
 * Answers the page's full HTML body as `text/html` — NOT a JSON envelope. The
 * `?includeIDs=true` query option is Graph's own documented switch to tag
 * every addressable element with a stable `id`/`data-id`, which the reference
 * says is "used to update pages": Update Page Content's `patchContentCommand`
 * targets those same ids via a `#id` selector, so a caller building an update
 * should fetch content with this on first.
 *
 * Least privileged delegated permission: `Notes.Read`. This App requests the
 * broader `Notes.ReadWrite`. Supported for both work-or-school and personal
 * Microsoft accounts.
 */
const getPageContent: ActionDefinition<Input, Output> = {
  key: "get-page-content",
  type: "read",
  resource: "page",
  title: "Get Page Content",
  description: "Get a OneNote page's HTML content.",
  params: [
    ...locationParams(),
    pageIdParam,
    {
      key: "includeIds",
      label: "Include element IDs",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Tags every addressable element with a stable id, via `?includeIDs=true`. Needed to target elements with Update Page Content afterwards.",
    },
  ],
  output: [{ key: "content", type: "string", label: "HTML content" }],

  async execute(input, ctx): Promise<Output> {
    const client = new GraphClient(ctx);
    const content = await client.html(pagePath(input, input.pageId, "/content"), {
      query: { includeIDs: input.includeIds || undefined },
    });
    return { content };
  },
};

export default getPageContent;
