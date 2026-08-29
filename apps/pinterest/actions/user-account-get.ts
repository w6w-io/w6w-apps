import type { ActionDefinition } from "@w6w/types";
import { PinterestClient } from "../lib/client.ts";
import { adAccountIdParam } from "../lib/params.ts";

/**
 * `GET /v5/user_account` — the connected account's own profile. The same
 * endpoint the `oauth2` Auth method uses as its `test`/`afterConnect` probe;
 * this action exposes it as an ordinary read for workflows that want the
 * account's counts (boards, Pins, followers, monthly views) mid-flow.
 */
interface Input {
  adAccountId?: string;
}

const userAccountGet: ActionDefinition<Input> = {
  key: "user-account-get",
  type: "read",
  resource: "account",
  title: "Get Account Info",
  description: "Fetch the connected Pinterest account's profile and counts.",
  params: [adAccountIdParam],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "account_type", type: "string", label: "Account type (PINNER or BUSINESS)" },
    { key: "profile_image", type: "string", label: "Profile image URL" },
    { key: "website_url", type: "string", label: "Website URL" },
    { key: "board_count", type: "number", label: "Board count" },
    { key: "pin_count", type: "number", label: "Pin count" },
    { key: "follower_count", type: "number", label: "Follower count" },
    { key: "following_count", type: "number", label: "Following count" },
    { key: "monthly_views", type: "number", label: "Monthly views" },
  ],

  async execute(input, ctx) {
    return await new PinterestClient(ctx).json(`/user_account`, {
      query: { ad_account_id: input.adAccountId },
    });
  },
};

export default userAccountGet;
