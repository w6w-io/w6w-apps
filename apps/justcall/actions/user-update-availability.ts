import type { ActionDefinition } from "@w6w/types";
import { compact, JustCallClient } from "../lib/client.ts";

/**
 * `PUT /v2.1/users/availability` — verified against
 * `update_user_availability_v21`'s OpenAPI fragment, 2026-09-05.
 */
interface Input {
  agent_id: number;
  is_available: boolean;
  unavailability_reason?: string;
}

const userUpdateAvailability: ActionDefinition<Input> = {
  key: "user-update-availability",
  type: "perform",
  resource: "user",
  title: "Update User Availability",
  description: "Set a user (agent) as available or unavailable, with an optional reason.",
  // Setting the same availability twice ends in the same state.
  idempotent: true,
  params: [
    { key: "agent_id", label: "Agent ID", type: "number", required: true },
    { key: "is_available", label: "Available", type: "boolean", required: true },
    {
      key: "unavailability_reason",
      label: "Unavailability reason",
      type: "string",
      hint: "Must already exist in your account's configured reasons.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "success or failed" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data("/users/availability", {
      method: "PUT",
      body: compact({
        agent_id: input.agent_id,
        is_available: input.is_available,
        unavailability_reason: input.unavailability_reason,
      }),
    });
  },
};

export default userUpdateAvailability;
