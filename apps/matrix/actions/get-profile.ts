import type { ActionDefinition } from "@w6w/types";
import { MatrixClient, seg } from "../lib/client.ts";

interface Input {
  userId: string;
}

interface Output {
  displayName?: string;
  avatarUrl?: string;
}

/**
 * `GET /_matrix/client/v3/profile/{userId}` — the complete public profile
 * (display name, avatar) for any Matrix user, including ones the connected
 * account has never messaged. The spec marks this endpoint
 * "Requires authentication: No", but it still travels signed here since a
 * Connection is always available when an action runs and a homeserver may
 * choose to require it (`M_FORBIDDEN`) for privacy reasons.
 */
const getProfile: ActionDefinition<Input, Output> = {
  key: "get-profile",
  type: "read",
  title: "Get User Profile",
  description: "Read a user's display name and avatar.",
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "@alice:matrix.org",
    },
  ],
  output: [
    { key: "displayName", type: "string", label: "Display Name" },
    { key: "avatarUrl", type: "string", label: "Avatar URL" },
  ],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const res = await client.request<{ displayname?: string; avatar_url?: string }>(
      `/profile/${seg(input.userId)}`,
    );
    return { displayName: res.displayname, avatarUrl: res.avatar_url };
  },
};

export default getProfile;
