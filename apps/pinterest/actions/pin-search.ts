import type { ActionDefinition } from "@w6w/types";
import { PinterestClient, type PinterestListPage } from "../lib/client.ts";
import { adAccountIdParam } from "../lib/params.ts";

/**
 * `GET /v5/search/pins` — search the connected account's OWN Pins (not the
 * public Pinterest catalog). `query` is the only required parameter, and
 * Pinterest documents it as either free-text keywords or a comma-separated
 * list of Pin IDs.
 *
 * This endpoint's `security` in the OpenAPI description lists only
 * `pinterest_oauth2`, not `client_credentials` — the only endpoint among the
 * ones this app uses where that's true — kept as a fact worth knowing rather
 * than acted on, since this app only ever uses the user-context flow anyway.
 */
interface Input {
  query: string;
  adAccountId?: string;
  bookmark?: string;
}

const pinSearch: ActionDefinition<Input> = {
  key: "pin-search",
  type: "search",
  resource: "pin",
  title: "Search My Pins",
  description: "Search the connected account's own Pins by keyword or comma-separated Pin IDs.",
  params: [
    {
      key: "query",
      label: "Search query",
      type: "string",
      required: true,
      hint: "Keywords, or a comma-separated list of Pin IDs.",
    },
    adAccountIdParam,
    {
      key: "bookmark",
      label: "Bookmark (page cursor)",
      type: "string",
      advanced: true,
      hint: "Opaque cursor from a previous page's response. Leave empty for the first page.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Matching Pins" },
    { key: "bookmark", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json<PinterestListPage<unknown>>(`/search/pins`, {
      query: { query: input.query, ad_account_id: input.adAccountId, bookmark: input.bookmark },
    });
  },
};

export default pinSearch;
