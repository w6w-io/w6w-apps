import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
}

/**
 * `GET /v2/social-sets/{social_set_id}/` — full detail for one social set:
 * every configured platform account (X, LinkedIn, Mastodon, Threads, Bluesky,
 * Substack) plus the shared publishing quota snapshot. Note the vendor's own
 * trailing slash on this one path — every other single-resource path in this
 * API omits it.
 */
const socialSetGet: ActionDefinition<Input> = {
  key: "social-set-get",
  type: "read",
  resource: "social-set",
  title: "Get Social Set",
  description: "Fetch full detail for one social set (account), including all platforms.",
  params: [socialSetIdParam],
  output: [
    { key: "id", type: "number", label: "Social set ID" },
    { key: "username", type: "string", label: "Username/handle" },
    { key: "name", type: "string", label: "Display name" },
    { key: "profile_image_url", type: "string", label: "Profile image URL" },
    { key: "team", type: "object", label: "Owning team, or null for a personal account" },
    { key: "platforms", type: "object", label: "Configured platform accounts, keyed by platform" },
    { key: "publishing_quota", type: "object", label: "Shared publishing quota snapshot" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/`);
  },
};

export default socialSetGet;
