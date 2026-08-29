import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";
import { PROFILE_OUTPUT_FIELDS } from "../lib/profile-fields.ts";

interface Input {
  accountId: number;
  profileName: string;
}

/**
 * `POST /accounts/{account_id}/profiles` — create a new profile under an account. Requires
 * a Master Account (agency) Key. Verified against `whatconverts.com/api/profiles/` on
 * 2026-08-29.
 */
const profileCreate: ActionDefinition<Input> = {
  key: "profile-create",
  type: "perform",
  resource: "profile",
  title: "Create Profile",
  description: "Create a new profile under an account. Requires a Master Account (agency) " +
    "Key.",
  idempotent: false,
  params: [
    { key: "accountId", label: "Account ID", type: "number", required: true },
    { key: "profileName", label: "Profile name", type: "string", required: true },
  ],
  output: PROFILE_OUTPUT_FIELDS,

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).post(`/accounts/${input.accountId}/profiles`, {
      profile_name: input.profileName,
    });
  },
};

export default profileCreate;
