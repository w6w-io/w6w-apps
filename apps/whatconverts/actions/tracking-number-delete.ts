import type { ActionDefinition } from "@w6w/types";
import { WhatConvertsClient } from "../lib/client.ts";

interface Input {
  phoneNumberId: number;
}

interface Output {
  phone_number_id: number;
}

/**
 * `DELETE /tracking/numbers/{phone_number_id}` — permanently delete a tracking phone
 * number.
 *
 * Verified against `whatconverts.com/api/tracking/` on 2026-08-29, which carries its own
 * notice: "After deleting you will no longer be able to track phone calls for this phone
 * number." Not idempotent for the same reason as `account-delete`.
 */
const trackingNumberDelete: ActionDefinition<Input, Output> = {
  key: "tracking-number-delete",
  type: "perform",
  resource: "tracking-number",
  title: "Delete Tracking Number",
  description: "Permanently delete a tracking phone number. This cannot be undone; call " +
    "tracking for this number stops immediately.",
  idempotent: false,
  params: [
    { key: "phoneNumberId", label: "Phone number ID", type: "number", required: true },
  ],
  output: [
    { key: "phone_number_id", type: "number", label: "The deleted phone number's ID" },
  ],

  async execute(input, ctx) {
    return await new WhatConvertsClient(ctx).delete(`/tracking/numbers/${input.phoneNumberId}`);
  },
};

export default trackingNumberDelete;
