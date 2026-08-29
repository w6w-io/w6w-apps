import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { PROFILE_OUTPUT_FIELDS } from "../lib/profile-fields.ts";

interface Input {
  accountId: number;
  profileId: number;
  profileName: string;
}

/**
 * `POST /accounts/{account_id}/profiles/{profile_id}` — rename a profile. Requires a
 * Master Account (agency) Key. Verified against `whatconverts.com/api/profiles/` on
 * 2026-08-29 — `profile_name` is the only documented field.
 */
const profileUpdate: ActionDefinition<Input> = {
  key: "profile-update",
  type: "perform",
  resource: "profile",
  title: "Update Profile",
  description: "Edit a profile's name. Requires a Master Account (agency) Key.",
  idempotent: true,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "profileId", label: "Profile ID", type: "number", required: true },
    { key: "profileName", label: "Profile name", type: "string", required: true },
  ],
  output: PROFILE_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).post(
      `/accounts/${input.accountId}/profiles/${input.profileId}`,
      { profile_name: input.profileName },
    );
  },
};

export default profileUpdate;
