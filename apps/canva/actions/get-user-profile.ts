import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

/**
 * `GET /v1/users/me/profile` — requires `profile:read`. Currently only
 * returns `display_name`; Canva documents more fields arriving in future.
 */
const getUserProfile: ActionDefinition<Record<string, never>> = {
  key: "get-user-profile",
  type: "read",
  resource: "user",
  title: "Get User Profile",
  description: "Get the connected user's display name.",
  params: [],
  output: [
    { key: "display_name", type: "string", label: "Display name" },
  ],

  async execute(_input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ profile: Record<string, unknown> }>(
      "/rest/v1/users/me/profile",
    );
    return res.profile;
  },
};

export default getUserProfile;
