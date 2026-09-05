import type { ActionDefinition } from "@w6w/types";
import { LinkedInConversionsClient, restliList, sponsoredAccountUrn } from "../lib/client.ts";
import { accountIdParam, conversionOwnershipTypeOptions } from "../lib/params.ts";

interface Input {
  accountId: string;
  ownershipTypes?: string[];
  start?: number;
  count?: number;
}

/**
 * `GET /rest/conversions?q=account&account=...` — the only documented
 * finder for Conversion Rules, so (like `linkedin-ads`'s DMP Segment
 * finder) an Ad Account is required rather than one optional filter among
 * several.
 *
 * Index-paginated (`start`/`count`, `paging.total`) — the older shape, not
 * the cursor `pageSize`/`pageToken` shape `linkedin-ads` uses for its own
 * cursor-paginated resources. See `lib/client.ts` for why this app doesn't
 * normalise the two.
 *
 * `conversionOwnershipTypes` (available from API version 202605 on, which
 * this app's pinned 202608 postdates) opts into also seeing conversion
 * rules **shared** from another ad account under the same Business Manager
 * — omitted, only rules owned by this account are returned, per the docs'
 * own default.
 */
const conversionRuleList: ActionDefinition<Input> = {
  key: "conversion-rule-list",
  type: "search",
  resource: "conversion-rule",
  title: "List Conversion Rules",
  description: "Find Conversion Rules belonging to an Ad Account.",
  params: [
    accountIdParam,
    {
      key: "ownershipTypes",
      label: "Ownership types",
      type: "multiselect",
      options: conversionOwnershipTypeOptions,
      hint: "Leave empty to see only rules owned by this account (the vendor's default).",
      advanced: true,
    },
    { key: "start", label: "Start (offset)", type: "number", default: 0 },
    { key: "count", label: "Count", type: "number", default: 10, hint: "Page size." },
  ],
  output: [
    { key: "elements", type: "array", label: "Conversion rules" },
    { key: "paging", type: "object", label: "Paging (start/count/total)" },
  ],

  execute(input, ctx) {
    const client = new LinkedInConversionsClient(ctx);
    return client.request("/rest/conversions", {
      query: {
        q: "account",
        account: sponsoredAccountUrn(input.accountId),
        start: String(input.start ?? 0),
        count: String(input.count ?? 10),
        conversionOwnershipTypes: input.ownershipTypes?.length
          ? restliList(input.ownershipTypes)
          : undefined,
      },
    });
  },
};

export default conversionRuleList;
