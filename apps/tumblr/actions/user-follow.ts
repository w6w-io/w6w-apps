import type { ActionDefinition } from "@w6w/types";
import { compact, TumblrClient } from "../lib/client.ts";

/**
 * `POST /v2/user/follow` — follow a blog, by URL or by email (email only
 * works if the target blog enabled "Let people find your blogs through this
 * address"). Documented "OAuth" auth level. Limited to 200 follows/day/user
 * and 5,000 blogs a caller may follow at a time.
 */
interface Input {
  url?: string;
  email?: string;
}

const userFollow: ActionDefinition<Input> = {
  key: "user-follow",
  type: "perform",
  resource: "user",
  title: "Follow Blog",
  description: "Follow a blog, by its URL or (if enabled) its owner's email.",
  idempotent: true,
  params: [
    { key: "url", label: "Blog URL", type: "string", hint: "Must supply URL or email." },
    { key: "email", label: "Blog owner's email", type: "string" },
  ],
  output: [{ key: "blog", type: "object", label: "The followed blog" }],

  execute(input, ctx) {
    if (!input.url && !input.email) throw new Error("Provide either url or email");
    return new TumblrClient(ctx).data("/user/follow", {
      method: "POST",
      body: compact({ url: input.url, email: input.email }),
    });
  },
};

export default userFollow;
