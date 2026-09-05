import type { ActionDefinition } from "@w6w/types";
import { TikTokClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  filtering?: Record<string, unknown>;
  fields?: string[];
  page?: number;
  pageSize?: number;
}

/**
 * `GET /open_api/v1.3/page/lead/get/` — confirmed live 2026-09-05, same
 * signal as the other actions (structured auth-error body vs. plain-text
 * `Not Found`). This is a DIFFERENT route from `lead/get/`: it sits under
 * `page/`, TikTok's namespace for an organic Business Page (as opposed to an
 * ad account), for leads captured through a Page's own Instant Form rather
 * than a paid ad.
 *
 * `businessId` is a lower-confidence choice than `advertiserId` on the
 * sibling actions: it is NOT confirmed for this specific route. It is
 * inferred by analogy — `GET /open_api/v1.3/business/get/`, probed with zero
 * query params, answered `{"code":40002,"message":"Missing required
 * field(s): creator_id or business_id."}` before any auth check ran,
 * confirming `business_id` is this API's real scoping parameter for
 * Business-Center-owned resources (a Page belongs to a Business Center).
 * TikTok's own docs for exactly this route could not be fetched (see the app
 * README), so if `businessId` turns out to be the wrong field name for your
 * account, use `filtering` to pass whatever TikTok's UI/support actually
 * names it.
 */
const getPageLead: ActionDefinition<Input> = {
  key: "get-page-lead",
  type: "read",
  resource: "lead",
  title: "Get Page Lead",
  description:
    "Fetch a lead captured through a TikTok (organic) Business Page's Instant Form, as " +
    "opposed to a paid ad. `businessId` is this app's best-supported guess at the required " +
    "scope id for this route (see the app README); use `filtering` to pass any field TikTok " +
    "actually names differently for your account.",
  params: [
    { key: "businessId", label: "Business Center ID", type: "string", required: true },
    {
      key: "filtering",
      label: "Filtering",
      type: "json",
      hint: "TikTok's `filtering` object for this endpoint (e.g. Page or lead identifiers), " +
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
    const data = await client.request("/page/lead/get/", {
      query: {
        business_id: input.businessId,
        filtering: input.filtering,
        fields: input.fields,
        page: input.page,
        page_size: input.pageSize,
      },
    });
    return { data };
  },
};

export default getPageLead;
