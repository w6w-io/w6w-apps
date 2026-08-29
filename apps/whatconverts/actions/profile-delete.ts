import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";

interface Input {
  accountId: number;
  profileId: number;
}

interface Output {
  profile_id: number;
}

/**
 * `DELETE /accounts/{account_id}/profiles/{profile_id}` — permanently delete a profile.
 * Requires a Master Account (agency) Key.
 *
 * Verified against `whatconverts.com/api/profiles/` on 2026-08-29, which carries its own
 * notice: "This will remove all numbers, leads and other settings associated with this
 * profile." Not idempotent for the same reason as `account-delete`.
 */
const profileDelete: ActionDefinition<Input, Output> = {
  key: "profile-delete",
  type: "perform",
  resource: "profile",
  title: "Delete Profile",
  description: "Permanently delete a profile, its numbers, leads and settings. Requires a " +
    "Master Account (agency) Key. This cannot be undone.",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "profileId", label: "Profile ID", type: "number", required: true },
  ],
  output: [
    { key: "profile_id", type: "number", label: "The deleted profile's ID" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).delete(
      `/accounts/${input.accountId}/profiles/${input.profileId}`,
    );
  },
};

export default profileDelete;
