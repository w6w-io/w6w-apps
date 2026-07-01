import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  formId: string;
  since?: number;
  limit?: number;
  pageAccessToken?: string;
  cursor?: string;
}

interface LeadFieldDatum {
  name: string;
  values: unknown[];
}

interface Lead {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  adset_name?: string;
  form_id?: string;
  field_data: LeadFieldDatum[];
}

/**
 * List recent leads submitted through a Facebook Lead Ads form.
 *
 * This mirrors n8n's polling fallback path: `GET /{form_id}/leads`. The
 * webhook-based trigger is out of scope for now (w6w has no trigger model)
 * so this action is what users compose into a scheduled workflow to fetch
 * new leads.
 *
 * As with `/leadgen_forms`, the endpoint prefers a page access token. We
 * accept an optional `pageAccessToken` override and otherwise fall back to
 * the connection's user token.
 */
const listRecentLeads: ActionDefinition<Input, FacebookListResponse<Lead>> = {
  key: "list-recent-leads",
  type: "read",
  resource: "lead",
  title: "List Recent Leads",
  description:
    "Poll a Facebook Lead Ads form for recently-submitted leads. Use `since` (unix seconds) to fetch only leads created after a checkpoint.",
  params: [
    { key: "formId", label: "Form ID", type: "string", required: true },
    {
      key: "since",
      label: "Since (unix seconds)",
      type: "number",
      hint: "Only return leads created strictly after this unix timestamp.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "pageAccessToken",
      label: "Page access token",
      type: "secret",
      hint: "Optional. Overrides the connection's user token for Page-scoped access.",
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "Facebook `after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Leads" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<Lead>>(
      `/${input.formId}/leads`,
      {
        query: {
          fields: "id,created_time,ad_id,ad_name,adset_id,adset_name,form_id,field_data",
          limit: input.limit ?? 25,
          // `filtering` is Facebook's field-level filter syntax; the API also
          // accepts a `since` unix-seconds shortcut on the leads edge.
          since: input.since,
          after: input.cursor,
        },
        bearerOverride: input.pageAccessToken,
      },
    );
  },
};

export default listRecentLeads;
