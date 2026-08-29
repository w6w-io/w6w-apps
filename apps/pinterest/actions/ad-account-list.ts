import type { ActionDefinition } from "@w6w/types";
import { PinterestClient, type PinterestListPage } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

/**
 * `GET /v5/ad_accounts` — the ad accounts the connected account owns or,
 * via Pinterest Business Access, has been granted access to. Requires the
 * `ads:read` scope this app's `oauth2` Auth requests.
 *
 * `include_shared_accounts` defaults `true` on Pinterest's side; restated
 * explicitly here so a caller can see and override it rather than relying on
 * an unstated default.
 */
interface Input {
  includeSharedAccounts?: boolean;
  pageSize?: number;
  bookmark?: string;
}

const adAccountList: ActionDefinition<Input> = {
  key: "ad-account-list",
  type: "search",
  resource: "ad-account",
  title: "List Ad Accounts",
  description: "List the ad accounts the connected account can act as, via Business Access.",
  params: [
    {
      key: "includeSharedAccounts",
      label: "Include shared ad accounts",
      type: "boolean",
      default: true,
    },
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Ad accounts" },
    { key: "bookmark", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json<PinterestListPage<unknown>>(`/ad_accounts`, {
      query: {
        include_shared_accounts: input.includeSharedAccounts,
        ...paginationQuery(input),
      },
    });
  },
};

export default adAccountList;
