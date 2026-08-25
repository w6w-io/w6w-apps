import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * GET /users/{id}/scheduling-availability — the user's weekly hours plus any
 * date-specific overrides.
 */
const userSchedulingAvailabilityGet: ActionDefinition<Input> = {
  key: "user-scheduling-availability-get",
  type: "read",
  resource: "user",
  title: "Get Scheduling Availability",
  description: "Fetch a user's scheduling availability (GET /users/{id}/scheduling-availability).",
  output: [
    { key: "timezone", type: "string", label: "Timezone" },
    { key: "weekly", type: "array", label: "Weekly hours" },
    { key: "overrides", type: "array", label: "Date overrides" },
  ],
  params: [
    { key: "id", label: "User ID", type: "string", required: true },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request(
      `/users/${encodeURIComponent(input.id)}/scheduling-availability`,
    );
  },
};

export default userSchedulingAvailabilityGet;
