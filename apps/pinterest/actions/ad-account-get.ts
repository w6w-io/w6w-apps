import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";

/**
 * `GET /v5/ad_accounts/{ad_account_id}` — one ad account's profile (name,
 * currency, country, time zone, owner, permissions). Requires `ads:read`.
 */
interface Input {
  adAccountId: string;
}

const adAccountGet: ActionDefinition<Input> = {
  key: "ad-account-get",
  type: "read",
  resource: "ad-account",
  title: "Get Ad Account",
  description: "Fetch one ad account's profile by ID.",
  params: [
    {
      key: "adAccountId",
      label: "Ad account",
      type: "string",
      required: true,
      hint: "The ad account's numeric ID, from ad-account-list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Ad account ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "country", type: "string", label: "Country" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "owner", type: "object", label: "Owner" },
    { key: "permissions", type: "array", label: "Permissions" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(
      `/ad_accounts/${encodeURIComponent(input.adAccountId)}`,
    );
  },
};

export default adAccountGet;
