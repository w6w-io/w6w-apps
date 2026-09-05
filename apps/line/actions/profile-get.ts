import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `GET /v2/bot/profile/{userId}` — a friend's (or recent-messenger's) profile.
 *
 * Only reachable for users who have added the Official Account as a friend, or who have messaged
 * it in the last window without being a friend. A blocked user's profile is never reachable.
 */
const profileGet: ActionDefinition<Input> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Get a user's display name, picture and status message.",
  params: [userIdParam],
  output: [
    { key: "displayName", type: "string", label: "Display name" },
    { key: "userId", type: "string", label: "User ID" },
    { key: "language", type: "string", label: "Language (BCP 47)" },
    { key: "pictureUrl", type: "string", label: "Profile image URL" },
    { key: "statusMessage", type: "string", label: "Status message" },
  ],

  execute(input, ctx) {
    const userId = String(input.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    return new LineClient(ctx).json(`/v2/bot/profile/${encodeURIComponent(userId)}`);
  },
};

export default profileGet;
