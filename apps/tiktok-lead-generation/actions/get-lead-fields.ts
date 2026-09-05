import type { ActionDefinition } from "@w6w/types";
import { TikTokClient } from "../lib/client.ts";

interface Input {
  advertiserId: string;
  filtering?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
}

/**
 * `GET /open_api/v1.3/lead/field/get/` — confirmed live 2026-09-05 the same
 * way as `get-lead.ts`: a structured `{"code":40105,...}` auth-error body
 * under a fake token, not the plain-text `Not Found` a made-up path returns.
 *
 * Matches the docs-portal page titled "Get fields of an Instant Form or
 * direct message leads" (slug `get-fields-of-an-instant-form-or-direct-
 * message-leads`, v1.3), confirmed to exist via `portal/sitemap.xml`. As with
 * `get-lead`, the page's body could not be fetched (client-rendered, no
 * public content API found), so `filtering` stays a raw JSON pass-through —
 * see the app README.
 *
 * No separate "list Instant Forms" endpoint could be confirmed: several
 * plausible paths (`page/lead/form/list/`, `instant_form/list/`,
 * `page/leadgen_form/list/`, …) were probed live and all answered the
 * plain-text `Not Found` a nonexistent route gives here, so it is left out
 * rather than guessed. This action — fetching a known form's field schema —
 * is the closest confirmed substitute.
 */
const getLeadFields: ActionDefinition<Input> = {
  key: "get-lead-fields",
  type: "read",
  resource: "lead-form",
  title: "Get Lead Form Fields",
  description:
    "Fetch the field schema of an Instant Form or direct-message lead ad. `filtering` is " +
    "passed through verbatim as TikTok's raw JSON filter object (e.g. the form id) — see the " +
    "app README for why the exact field name isn't hardcoded here.",
  params: [
    { key: "advertiserId", label: "Advertiser ID", type: "string", required: true },
    {
      key: "filtering",
      label: "Filtering",
      type: "json",
      hint: "TikTok's `filtering` object for this endpoint (e.g. the Instant Form id), passed " +
        "through verbatim.",
    },
    { key: "page", label: "Page", type: "number" },
    { key: "pageSize", label: "Page size", type: "number" },
  ],
  output: [{ key: "data", type: "object", label: "Response data" }],

  async execute(input, ctx) {
    const client = new TikTokClient(ctx);
    const data = await client.request("/lead/field/get/", {
      query: {
        advertiser_id: input.advertiserId,
        filtering: input.filtering,
        page: input.page,
        page_size: input.pageSize,
      },
    });
    return { data };
  },
};

export default getLeadFields;
