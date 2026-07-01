import type { ActionDefinition } from "@w6w/types";
import { FacebookClient, type FacebookListResponse } from "../lib/client.ts";

interface Input {
  pageId: string;
  pageAccessToken?: string;
  cursor?: string;
}

interface FormSummary {
  id: string;
  name: string;
  status?: string;
  locale?: string;
}

/**
 * List Lead Ads forms belonging to a Facebook Page.
 *
 * Facebook's `/{page_id}/leadgen_forms` endpoint requires a **page** access
 * token, not the connected user's token. n8n resolves this by calling
 * `/{page_id}?fields=access_token` first and then swapping the Authorization
 * header. We expose the same override explicitly via `pageAccessToken` — when
 * omitted we fall through to the user token (which works if the user has
 * `pages_read_engagement` on that Page).
 */
const listForms: ActionDefinition<Input, FacebookListResponse<FormSummary>> = {
  key: "list-forms",
  type: "read",
  resource: "form",
  title: "List Lead Ads Forms",
  description:
    "List the lead-generation forms for a Facebook Page. Use the returned form id in `list-recent-leads`.",
  params: [
    { key: "pageId", label: "Page ID", type: "string", required: true },
    {
      key: "pageAccessToken",
      label: "Page access token",
      type: "secret",
      hint:
        "Optional. Overrides the connection's user token — required if the user token lacks Page-scoped access.",
    },
    { key: "cursor", label: "Cursor", type: "string", hint: "Facebook `after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Forms" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  async execute(input, ctx) {
    const client = new FacebookClient(ctx);
    return client.request<FacebookListResponse<FormSummary>>(
      `/${input.pageId}/leadgen_forms`,
      {
        query: {
          fields: "id,name,status,locale",
          after: input.cursor,
        },
        bearerOverride: input.pageAccessToken,
      },
    );
  },
};

export default listForms;
