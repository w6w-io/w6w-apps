import type { ActionDefinition } from "@w6w/types";

/**
 * List every Marketing Campaigns list.
 * Wraps `GET /v3/marketing/lists`, following SendGrid's `_metadata.next`
 * pagination.
 */
const action: ActionDefinition = {
  key: "list-get-all",
  type: "perform",
  resource: "list",
  title: "Get many lists",
  description: "Get many lists",
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
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 100);

    ctx.log("info", "listing SendGrid lists", { returnAll, limit });

    const items: unknown[] = [];
    let next: string | undefined = "https://api.sendgrid.com/v3/marketing/lists";

    while (next) {
      const res: Response = await ctx.fetch(next, { method: "GET" });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`SendGrid list index returned ${res.status}: ${errText}`);
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
