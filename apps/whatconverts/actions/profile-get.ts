import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { PROFILE_OUTPUT_FIELDS } from "../lib/profile-fields.ts";

interface Input {
  accountId: number;
  profileId: number;
}

/**
 * `GET /accounts/{account_id}/profiles/{profile_id}` — details for a single profile.
 * Requires a Master Account (agency) Key. Verified against
 * `whatconverts.com/api/profiles/` on 2026-08-29.
 */
const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Get details for a single profile. Requires a Master Account (agency) Key.",
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "profileId", label: "Profile ID", type: "number", required: true },
  ],
  output: PROFILE_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).get(
      `/accounts/${input.accountId}/profiles/${input.profileId}`,
    );
  },
};

export default profileGet;
