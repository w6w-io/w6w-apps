import { assertEquals } from "@std/assert";
import blogAvatarGet from "../../actions/blog-avatar-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const AVATAR_URL = "https://64.media.tumblr.com/abc/def/s64x64u_c1/0123456789abcdef.png";

Deno.test("blog-avatar-get: reads avatar_url off the 302 response, never following it", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 302,
      headers: { location: AVATAR_URL, "content-type": "application/json" },
      body: { meta: { status: 302, msg: "Found" }, response: { avatar_url: AVATAR_URL } },
    },
  ]);

  const out = await blogAvatarGet.execute({ blogIdentifier: "david.tumblr.com", size: 64 }, ctx);

  assertEquals(calls.length, 1, "must not follow the redirect to the CDN host");
  assertEquals(pathOf(calls[0].url), "/v2/blog/david.tumblr.com/avatar/64");
  assertEquals(calls[0].redirect, "manual");
  assertEquals(out, { avatarUrl: AVATAR_URL });
});

Deno.test("blog-avatar-get: omitting size calls the sizeless path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 302, headers: { location: AVATAR_URL } },
  ]);
  await blogAvatarGet.execute({ blogIdentifier: "david.tumblr.com" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/blog/david.tumblr.com/avatar");
});

Deno.test("blog-avatar-get: falls back to parsing the JSON body if no Location header", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      headers: { "content-type": "application/json" },
      body: { meta: { status: 200, msg: "OK" }, response: { avatar_url: AVATAR_URL } },
    },
  ]);
  const out = await blogAvatarGet.execute({ blogIdentifier: "david.tumblr.com", size: 64 }, ctx);
  assertEquals(out, { avatarUrl: AVATAR_URL });
});
