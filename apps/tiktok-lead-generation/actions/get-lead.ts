import type { ActionDefinition } from "@w6w/types";
import { TikTokClient } from "../lib/client.ts";

interface Input {
  advertiserId: string;
  filtering?: Record<string, unknown>;
  fields?: string[];
  page?: number;
  pageSize?: number;
}

/**
 * `GET /open_api/v1.3/lead/get/` — confirmed live 2026-09-05: a fake
 * `Access-Token` header returns TikTok's structured
 * `{"code":40105,"message":"Access token is incorrect or has been revoked."}`
 * body, which is how a REAL route on this host answers under bad auth; a
 * made-up path (e.g. `/lead/list/`) answers plain-text `Not Found` instead.
 *
 * TikTok's docs portal (business-api.tiktok.com/portal/docs) lists a matching
 * page at slug `get-an-instant-form-lead-or-a-direct-message-lead`, version
 * `v1.3` — confirmed via `portal/sitemap.xml` — whose server-rendered SEO
 * metadata titles it "Get a TikTok Instant Form lead or a direct message
 * lead". The page's BODY (the exact non-universal request/response field
 * names) could not be fetched: it renders entirely client-side from an
 * internal API this app could not reach without a real browser session — see
 * the app README for what that means for this action's `filtering` param.
 *
 * `advertiserId` / `filtering` / `fields` / `page` / `pageSize` follow the one
 * convention confirmed across the ENTIRE Marketing API, cross-checked against
 * TikTok's own official SDK (`ad_api.py`'s `ad_get(advertiser_id, filtering,
 * page, page_size, fields)`) rather than guessed for this endpoint alone.
 */
const getLead: ActionDefinition<Input> = {
  key: "get-lead",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description:
    "Fetch an Instant Form or direct-message lead captured through TikTok ads. `filtering` " +
    "is passed through verbatim as TikTok's raw JSON filter object for this endpoint (e.g. a " +
    "form or lead id) — TikTok's own field names for it could not be independently confirmed; " +
    "see the app README.",
  params: [
    { key: "advertiserId", label: "Advertiser ID", type: "string", required: true },
    {
      key: "filtering",
      label: "Filtering",
      type: "json",
      hint: "TikTok's `filtering` object for this endpoint (e.g. form or lead identifiers), " +
        "passed through verbatim.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint: "Optional array of field names to include in the response.",
    },
    { key: "page", label: "Page", type: "number" },
    { key: "pageSize", label: "Page size", type: "number" },
  ],
  output: [{ key: "data", type: "object", label: "Response data" }],

  async execute(input, ctx) {
    const client = new TikTokClient(ctx);
    const data = await client.request("/lead/get/", {
      query: {
        advertiser_id: input.advertiserId,
        filtering: input.filtering,
        fields: input.fields,
        page: input.page,
        page_size: input.pageSize,
      },
    });
    return { data };
  },
};

export default getLead;
