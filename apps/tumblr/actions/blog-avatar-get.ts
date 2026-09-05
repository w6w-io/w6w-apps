import type { ActionDefinition } from "@w6w/types";
import { encodeId } from "../lib/client.ts";
import { blogIdentifierParam } from "../lib/params.ts";

/**
 * `GET /v2/blog/{blog-identifier}/avatar[/size]` — a blog's avatar image URL.
 *
 * Documented "None" auth level — no credential of any kind is required, and
 * `requiresAuth: false` below opts this action out of needing a Connection at
 * all.
 *
 * ## The doc says PNG bytes; the wire says something else, and it matters
 *
 * The vendor's own prose: "Requests that are **not** signed using OAuth1 will
 * receive the requested avatar in PNG format, while requests that are signed
 * will receive [JSON with] `avatar_url`." Read literally, that means this
 * app — which never signs with OAuth1 (see `auth/oauth2.ts`) — should get raw
 * image bytes back.
 *
 * A live, unsigned probe on 2026-09-05 shows otherwise:
 * `curl -sD - https://api.tumblr.com/v2/blog/staff.tumblr.com/avatar/64`
 * answers `HTTP/2 302`, `content-type: application/json`, and a body of
 * `{"meta":{"status":302,"msg":"Found"},"response":{"avatar_url":"https://64.media.tumblr.com/…/s64x64u_c1/….png"}}`
 * — the SAME small JSON envelope the doc says only a *signed* request gets,
 * plus a `Location` header carrying the identical URL. The actual PNG bytes
 * live one hop further, at that CDN URL.
 *
 * This action reads the JSON body directly, off the `302` `api.tumblr.com`
 * response itself, and never follows the redirect. That is not a style choice:
 * the redirect target is `64.media.tumblr.com`, a CDN host this app's
 * `network.allow` does not (and should not) list — an avatar is public,
 * unauthenticated content with nothing for a signed request to protect, so
 * there is no reason to widen the sandboxed egress allowlist just to fetch
 * bytes this action would immediately discard in favor of the URL.
 * `redirect: "manual"` is what makes that possible: without it, a fetch
 * implementation that auto-follows would either be blocked reaching the
 * undeclared CDN host, or would silently need it allowlisted.
 */
interface Input {
  blogIdentifier: string;
  size?: number;
}

const SIZES = [16, 24, 30, 40, 48, 64, 96, 128, 512];

interface AvatarEnvelope {
  response?: { avatar_url?: string };
}

const blogAvatarGet: ActionDefinition<Input> = {
  key: "blog-avatar-get",
  type: "read",
  resource: "blog",
  title: "Get Blog Avatar",
  description: "Fetch the URL of a blog's avatar image, in one of 9 supported sizes.",
  requiresAuth: false,
  params: [
    blogIdentifierParam,
    {
      key: "size",
      label: "Size",
      type: "select",
      options: SIZES.map((s) => ({ value: String(s), label: `${s}×${s}` })),
      default: "64",
      hint: "Must be one of the documented sizes: 16, 24, 30, 40, 48, 64, 96, 128, 512.",
    },
  ],
  output: [{ key: "avatarUrl", type: "string", label: "Avatar image URL" }],

  async execute(input, ctx) {
    const size = input.size ? Number(input.size) : undefined;
    const path = `/blog/${encodeId(input.blogIdentifier)}/avatar${size ? `/${size}` : ""}`;
    const res = await ctx.fetch(`https://api.tumblr.com/v2${path}`, {
      headers: { accept: "application/json" },
      redirect: "manual",
    });

    // A manual-redirect fetch reports a 3xx as status 0/"opaqueredirect" in
    // some environments and as the real 3xx status in others — branch on the
    // Location header (always present for this endpoint) rather than status.
    const location = res.headers.get("location");
    if (location) return { avatarUrl: location };

    if (!res.ok) {
      throw new Error(`Tumblr returned HTTP ${res.status} for GET ${path}`);
    }
    const body = await res.json() as AvatarEnvelope;
    const avatarUrl = body.response?.avatar_url;
    if (!avatarUrl) throw new Error(`Tumblr's avatar response for ${path} had no avatar_url`);
    return { avatarUrl };
  },
};

export default blogAvatarGet;
