import type { ActionDefinition } from "@w6w/types";
import { TikTokClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  filtering?: Record<string, unknown>;
}

/**
 * `GET /open_api/v1.3/page/lead/task/download/` — confirmed live 2026-09-05
 * (structured auth-error body, not the plain-text `Not Found` a made-up path
 * returns on this host). `GET` was confirmed as the working method by
 * elimination: `POST` on this same path answers plain-text `Not Found`
 * (route doesn't exist for that method), so this is a single synchronous
 * call rather than the create/check/download three-step job TikTok uses
 * elsewhere (confirmed live for its Reporting API: `POST
 * /open_api/v1.3/report/task/create/` answers `405 Method Not Allowed` under
 * GET — i.e. it exists and needs POST — while `GET .../check/` and
 * `.../download/` both work; no such `task/create` sibling could be found
 * anywhere under `lead/` or `page/lead/`).
 *
 * Matches the docs-portal pages titled "Download leads" and "Create a lead
 * download task" (slugs `download-leads`, `create-a-lead-download-task`,
 * v1.3 — confirmed to exist via `portal/sitemap.xml`), though which of those
 * two pages documents this exact route, and its exact response shape,
 * couldn't be confirmed — the portal renders every page's body client-side
 * from an internal API this app could not reach. See the app README.
 *
 * `businessId` carries the same lower-confidence caveat as `get-page-lead.ts`
 * — inferred from `business/get/`'s own live error, not confirmed for this
 * route specifically.
 */
const downloadPageLeads: ActionDefinition<Input> = {
  key: "download-page-leads",
  type: "read",
  resource: "lead",
  title: "Download Page Leads",
  description:
    "Bulk-fetch the leads captured through a TikTok (organic) Business Page's Instant Forms. " +
    "`businessId` is this app's best-supported guess at the required scope id for this route " +
    "(see the app README); use `filtering` for anything TikTok names differently for your " +
    "account, such as a date range or a specific form.",
  params: [
    { key: "businessId", label: "Business Center ID", type: "string", required: true },
    {
      key: "filtering",
      label: "Filtering",
      type: "json",
      hint: "TikTok's `filtering` object for this endpoint (e.g. a form id or date range), " +
        "passed through verbatim.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Response data" }],

  async execute(input, ctx) {
    const client = new TikTokClient(ctx);
    const data = await client.request("/page/lead/task/download/", {
      query: {
        business_id: input.businessId,
        filtering: input.filtering,
      },
    });
    return { data };
  },
};

export default downloadPageLeads;
