import type { ActionDefinition } from "@w6w/types";

/**
 * List every contact, with optional SGQL query filter.
 * Handles SendGrid's `_metadata.next` pagination.
 * No filter: `GET /v3/marketing/contacts`.
 * With `filters.query`: `POST /v3/marketing/contacts/search`.
 */
const action: ActionDefinition = {
  key: "contact-get-all",
  type: "perform",
  resource: "contact",
  title: "Get many contacts",
  description: "Get many contacts, optionally filtered by SGQL",
  params: [
    {
      key: "returnAll",
      label: "Return All",
      type: "boolean",
      default: false,
      hint: "Whether to return all results or only up to a given limit",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      hint: "Max number of results to return",
    },
    {
      key: "filters",
      label: "Filters",
      type: "group",
      default: {},
      children: [
        {
          key: "query",
          label: "Query",
          type: "string",
          default: "",
          hint:
            "Valid <a href=\"https://sendgrid.com/docs/for-developers/sending-email/segmentation-query-language/\">SGQL</a> expression",
        },
      ],
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);
    const filters = (p.filters ?? {}) as Record<string, unknown>;
    const query = typeof filters.query === "string" ? filters.query.trim() : "";

    const useSearch = query.length > 0;
    const method = useSearch ? "POST" : "GET";
    const base = useSearch
      ? "https://api.sendgrid.com/v3/marketing/contacts/search"
      : "https://api.sendgrid.com/v3/marketing/contacts";

    const headers: Record<string, string> = {};
    let body: string | undefined;
    if (useSearch) {
      headers["content-type"] = "application/json";
      body = JSON.stringify({ query });
    }

    ctx.log("info", "listing SendGrid contacts", { returnAll, limit, useSearch });

    const items: unknown[] = [];
    let next: string | undefined = base;

    while (next) {
      const res: Response = await ctx.fetch(next, { method, headers, body });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SendGrid contact list returned ${res.status}: ${errText}`);
      }
      const page = await res.json();
      if (Array.isArray(page.result)) items.push(...page.result);
      next = page?._metadata?.next as string | undefined;
      if (!returnAll && items.length >= limit) break;
    }

    return returnAll ? items : items.slice(0, limit);
  },
};

export default action;
