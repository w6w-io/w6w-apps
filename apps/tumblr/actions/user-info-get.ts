import type { ActionDefinition } from "@w6w/types";
import { TumblrClient } from "../lib/client.ts";

/**
 * `GET /v2/user/info` — the connected account's own profile: name, total
 * likes/following counts, default post format, and the blogs it can post to.
 * Documented "OAuth" auth level. Same endpoint `auth/oauth2.ts` uses as its
 * credential-liveness probe.
 */
const userInfoGet: ActionDefinition<Record<string, never>> = {
  key: "user-info-get",
  type: "read",
  resource: "user",
  title: "Get My Info",
  description: "Fetch the connected account's profile and the blogs it can post to.",
  params: [],
  output: [{ key: "user", type: "object", label: "The connected user" }],

  execute(_input, ctx) {
    return new TumblrClient(ctx).data("/user/info");
  },
};

export default userInfoGet;
